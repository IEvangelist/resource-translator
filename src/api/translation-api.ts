import { debug, setFailed } from "@actions/core";
import { randomUUID } from "node:crypto";
import createClient, { isUnexpected } from "@azure-rest/ai-translation-text";
import type {
  TextTranslationClient,
  TranslateBody,
} from "@azure-rest/ai-translation-text";
import { AvailableTranslations } from "../abstractions/available-translations";
import {
  TranslationResult,
  TranslationResults,
  TranslationResultSet,
} from "../abstractions/translation-results";
import { TranslatorResource } from "../abstractions/translator-resource";
import { toResultSet } from "../helpers/api-result-set-mapper";
import { protect, restore } from "../helpers/placeholders";
import { isTransientStatus, retryablePost } from "../helpers/retry";
import { batch, chunk } from "../helpers/utils";

/** Translate-time options that are NOT properties of the Translator
 *  resource itself (auth, region, category) — these belong to the action's
 *  per-call behavior (retries, placeholder protection, etc). Kept separate
 *  so the resource abstraction stays a pure config-of-Azure value. */
export interface TranslateOptions {
  /** Wrap placeholders in sentinels before sending to Translator. */
  protectPlaceholders?: boolean;
  /** Extra regex patterns appended to the placeholder protector. */
  customPlaceholderPatterns?: readonly string[];
  /** Max retry attempts on transient Translator failures. */
  maxRetries?: number;
  /** Cap (ms) on any single backoff sleep. */
  retryBackoffMs?: number;
}

// The Translator "languages" lookup is anonymous and lives on the global
// Microsoft endpoint regardless of how the user has configured their
// resource. Pinning it here matches the previous axios call exactly.
const PUBLIC_ENDPOINT = "https://api.cognitive.microsofttranslator.com";

// Build a Text Translation REST client.
//
// IMPORTANT: `@azure-rest/ai-translation-text` (v2) only applies the options
// bag (`apiVersion`, `baseUrl`, ...) when a credential argument is passed to
// `createClient`. We deliberately pass NO credential — authentication is
// injected per-request (see `buildAuthHeaders`) to avoid the SDK's
// `Ocp-Apim-Subscription-Region: undefined` bug for regionless resources —
// so this options bag is silently ignored. In particular `apiVersion` would
// otherwise fall back to the SDK's default preview version, whose
// `/translate` contract rejects the v3.0 request body with HTTP 400 (code
// 400074, "The body of the request is not valid JSON"). We therefore pin
// `api-version=3.0` explicitly on every request's query string instead (see
// the `queryParameters` in each call below); the SDK's `apiVersionPolicy`
// leaves an already-present `api-version` untouched.
const buildClient = (
  endpoint: string,
  apiVersion: string,
): TextTranslationClient =>
  createClient(endpoint, { baseUrl: endpoint, apiVersion });

// Authentication is intentionally injected per-request rather than via the
// SDK's credential overloads. In v1.0.x the credential type guards both
// match any object with a `key` field, so passing `AzureKeyCredential` for
// the regionless case still hits `TranslatorAuthenticationPolicy`, which
// unconditionally writes `Ocp-Apim-Subscription-Region` (with the value
// `undefined`) into the request headers. Per-call header injection
// sidesteps that bug and matches the previous axios behavior exactly.
const buildAuthHeaders = (
  translatorResource: TranslatorResource,
): Record<string, string> => {
  const headers: Record<string, string> = {
    "Ocp-Apim-Subscription-Key": translatorResource.subscriptionKey,
    "X-ClientTraceId": randomUUID(),
  };
  if (translatorResource.region) {
    headers["Ocp-Apim-Subscription-Region"] = translatorResource.region;
  }
  return headers;
};

// https://docs.microsoft.com/azure/cognitive-services/translator/language-support#translate
export const getAvailableTranslations = async (
  apiVersion: string = "3.0",
): Promise<AvailableTranslations> => {
  const client = buildClient(PUBLIC_ENDPOINT, apiVersion);
  const response = await client.path("/languages").get({
    // Pin api-version on the query string — the SDK ignores the client-level
    // `apiVersion` option because no credential is supplied (see buildClient).
    queryParameters: { "api-version": apiVersion, scope: "translation" },
  });

  if (isUnexpected(response)) {
    const errorMessage =
      response.body?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`Failed to fetch supported languages: ${errorMessage}`);
  }

  return response.body as AvailableTranslations;
};

export const translate = async (
  translatorResource: TranslatorResource,
  toLocales: string[],
  translatableText: Map<string, string>,
  filePath: string,
  options?: TranslateOptions,
): Promise<TranslationResultSet | undefined> => {
  try {
    // Current Azure Translator API rate limit
    // https://docs.microsoft.com/azure/cognitive-services/translator/request-limits#character-and-array-limits-per-request
    const apiRateLimit = 10000;
    const numberOfElementsLimit = 100;

    const validationErrors: string[] = [];
    translatableText.forEach((value, key) => {
      const valueStringifiedLength = JSON.stringify(value).length;
      if (valueStringifiedLength > apiRateLimit) {
        validationErrors.push(
          `Text for key '${key}' in file '${filePath}' is too long (${valueStringifiedLength}). Must be ${apiRateLimit} at most.`,
        );
      }
    });
    if (validationErrors.length) {
      setFailed(validationErrors.join("\r\n"));
      return undefined;
    }

    // Default placeholder protection ON. Disable explicitly via input only
    // when the source intentionally contains literal `{{name}}`-shaped text
    // that should be translated as-is.
    const protectEnabled = options?.protectPlaceholders !== false;

    // Per-call sentinel maps. We protect each text individually so the
    // sentinel counter cannot collide across keys, and we keep the order in
    // lockstep with `translatableText.values()` (the input array order is
    // the same order Translator preserves in its response).
    const sentinelMaps: Array<Map<string, string>> = [];
    const data = [...translatableText.values()].map((value) => {
      if (!protectEnabled) {
        sentinelMaps.push(new Map());
        return { text: value };
      }
      const { protected: p, tokens } = protect(
        value,
        options?.customPlaceholderPatterns,
      );
      sentinelMaps.push(tokens);
      return { text: p };
    });

    const apiVersion = translatorResource.apiVersion ?? "3.0";
    const client = buildClient(translatorResource.endpoint, apiVersion);
    const headers = buildAuthHeaders(translatorResource);

    const characters = JSON.stringify(data).length;
    const batchedData =
      characters > apiRateLimit || data.length > numberOfElementsLimit
        ? batch(data, numberOfElementsLimit, apiRateLimit)
        : [data];

    let results: TranslationResults = [];
    // Track which sentinel map to use per response row. Translator preserves
    // the order of inputs across the response, so the i-th batch row maps
    // back to the i-th sentinel map across the entire input.
    let nextSentinelOffset = 0;
    for (let i = 0; i < batchedData.length; i++) {
      const dataBatch = batchedData[i];
      const batchCharacters = JSON.stringify(dataBatch).length;
      const localeCount = toLocales.length;
      const localesBatchSize = Math.floor(apiRateLimit / batchCharacters);
      const batchedLocales =
        localesBatchSize < localeCount
          ? chunk(toLocales, localesBatchSize)
          : [toLocales];

      // Sentinel maps for THIS data batch (positional alignment with
      // dataBatch). Same maps are reused across every locale-batch since
      // Translator returns the per-locale translation rows in the same
      // input order.
      const sentinelsForBatch = sentinelMaps.slice(
        nextSentinelOffset,
        nextSentinelOffset + dataBatch.length,
      );
      nextSentinelOffset += dataBatch.length;

      for (let j = 0; j < batchedLocales.length; j++) {
        const locales = batchedLocales[j];
        debug(
          `Data batch ${i + 1}, Locales batch ${j + 1}, locales: ${locales.join(
            ", ",
          )}`,
        );

        // Build the query-string segment. `api-version` is pinned HERE (not
        // via the client options, which the SDK ignores without a credential
        // — see buildClient) so the request actually hits the v3.0
        // `/translate` contract. Each optional parameter is forwarded only
        // when it has a meaningful value — `allowFallback` is intentionally
        // serialized when explicitly false so the Translator default (true)
        // can be turned off. Multiple `to` values are accepted as a
        // comma-separated list by the v3.0 REST API; target locales and
        // options (incl. Custom Translator `category`) ride along as query
        // parameters, matching the previous major's on-the-wire behavior.
        const queryParameters = {
          "api-version": apiVersion,
          to: locales.join(","),
          ...(translatorResource.sourceLocale && {
            from: translatorResource.sourceLocale,
          }),
          ...(translatorResource.categoryId && {
            category: translatorResource.categoryId,
          }),
          ...(translatorResource.textType && {
            textType: translatorResource.textType,
          }),
          ...(translatorResource.profanityAction && {
            profanityAction: translatorResource.profanityAction,
          }),
          ...(translatorResource.profanityMarker &&
          translatorResource.profanityAction === "Marked"
            ? { profanityMarker: translatorResource.profanityMarker }
            : {}),
          ...(translatorResource.allowFallback !== undefined && {
            allowFallback: translatorResource.allowFallback,
          }),
        };

        const response = await retryablePost(
          () =>
            client.path("/translate").post({
              // The v3.0 `/translate` endpoint (api-version pinned on the
              // query string above) expects the request body to be a BARE
              // JSON array of `{ text }` items. The SDK's `TranslateBody`
              // type models the newer structured `{ inputs }` shape, but
              // `@azure-rest` serializes `body` verbatim to JSON, so we pass
              // the bare array and cast to satisfy the type. Wrapping it as
              // `{ inputs }` makes Azure reject the call with HTTP 400 (code
              // 400074, "The body of the request is not valid JSON").
              body: dataBatch as unknown as TranslateBody,
              headers,
              queryParameters,
            }),
          (resp) => isUnexpected(resp) && isTransientStatus(resp.status),
          {
            maxRetries: options?.maxRetries,
            retryBackoffMs: options?.retryBackoffMs,
          },
        );

        if (isUnexpected(response)) {
          const azureError = response.body?.error;
          if (azureError && (azureError.code || azureError.message)) {
            setFailed(
              `file: ${filePath}, error: { code: ${azureError.code}, message: '${azureError.message}' }`,
            );
          } else {
            setFailed(
              `Failed to translate input: file '${filePath}', HTTP ${response.status}`,
            );
          }
          return undefined;
        }

        const responseData = response.body as unknown as TranslationResult[];

        // Restore protected placeholders in every translation row. Each
        // response row corresponds to one input row in the SAME position
        // (Azure preserves input order), so the sentinel map at index k of
        // sentinelsForBatch applies to responseData[k].
        if (protectEnabled) {
          responseData.forEach((row, k) => {
            const tokens = sentinelsForBatch[k];
            if (!tokens || tokens.size === 0) return;
            row.translations = row.translations.map((t) => ({
              ...t,
              text: restore(t.text, tokens),
            }));
          });
        }

        debug(
          `Data batch ${i + 1}, Locales batch ${
            j + 1
          }, response: ${JSON.stringify(responseData)}`,
        );

        results = [...results, ...responseData];
      }
    }

    return toResultSet(results, toLocales, translatableText);
  } catch (ex: unknown) {
    // The SDK surfaces transport-layer failures (DNS, ECONNRESET, TLS, ...)
    // as RestError/Error instances thrown from the awaited `.post()` call.
    // Azure-shaped 4xx/5xx responses are *not* thrown — they come back
    // through `isUnexpected` above. We still tolerate the legacy
    // `{ response: { data: { error: {...} } } }` envelope here for
    // backwards compatibility with any caller (or test) that throws that
    // shape directly.
    const legacyAzureError = (ex as LegacyTranslatorError | undefined)?.response
      ?.data?.error;

    if (
      legacyAzureError &&
      (legacyAzureError.code || legacyAzureError.message)
    ) {
      setFailed(
        `file: ${filePath}, error: { code: ${legacyAzureError.code}, message: '${legacyAzureError.message}' }`,
      );
    } else {
      const message = ex instanceof Error ? ex.message : String(ex);
      setFailed(`Failed to translate input: file '${filePath}', ${message}`);
    }

    return undefined;
  }
};

interface LegacyTranslatorError {
  response: {
    data: {
      error: {
        code: number;
        message: string;
      };
    };
  };
}
