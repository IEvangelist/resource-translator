import { debug, setFailed } from "@actions/core";
import { randomUUID } from "node:crypto";
import createClient, { isUnexpected } from "@azure-rest/ai-translation-text";
import type { TextTranslationClient } from "@azure-rest/ai-translation-text";
import { AvailableTranslations } from "../abstractions/available-translations";
import {
  TranslationResult,
  TranslationResults,
  TranslationResultSet,
} from "../abstractions/translation-results";
import { TranslatorResource } from "../abstractions/translator-resource";
import { toResultSet } from "../helpers/api-result-set-mapper";
import { batch, chunk } from "../helpers/utils";

// The Translator "languages" lookup is anonymous and lives on the global
// Microsoft endpoint regardless of how the user has configured their
// resource. Pinning it here matches the previous axios call exactly.
const PUBLIC_ENDPOINT = "https://api.cognitive.microsofttranslator.com";

// Build a Text Translation REST client. We override `baseUrl` with the raw
// configured endpoint so the SDK does NOT rewrite
// `*.cognitiveservices.azure.com` hosts to `${endpoint}/translator/text/v3.0`
// — the previous implementation never rewrote, and existing users almost
// certainly hand-craft their endpoint to point at the v3 root already.
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
    queryParameters: { scope: "translation" },
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

    const data = [...translatableText.values()].map((value) => ({
      text: value,
    }));

    const apiVersion = translatorResource.apiVersion ?? "3.0";
    const client = buildClient(translatorResource.endpoint, apiVersion);
    const headers = buildAuthHeaders(translatorResource);

    const characters = JSON.stringify(data).length;
    const batchedData =
      characters > apiRateLimit || data.length > numberOfElementsLimit
        ? batch(data, numberOfElementsLimit, apiRateLimit)
        : [data];

    let results: TranslationResults = [];
    for (let i = 0; i < batchedData.length; i++) {
      const dataBatch = batchedData[i];
      const batchCharacters = JSON.stringify(dataBatch).length;
      const localeCount = toLocales.length;
      const localesBatchSize = Math.floor(apiRateLimit / batchCharacters);
      const batchedLocales =
        localesBatchSize < localeCount
          ? chunk(toLocales, localesBatchSize)
          : [toLocales];

      for (let j = 0; j < batchedLocales.length; j++) {
        const locales = batchedLocales[j];
        debug(
          `Data batch ${i + 1}, Locales batch ${j + 1}, locales: ${locales.join(
            ", ",
          )}`,
        );

        // Build the optional query-string segment. Each parameter is
        // forwarded only when it has a meaningful value — `allowFallback`
        // is intentionally serialized when explicitly false so the
        // Translator default (true) can be turned off.
        // Multiple `to` values are accepted as a comma-separated list by
        // the Translator REST API; this is the form used by the
        // ai-translation-text-rest 1.0.x sample suite.
        const queryParameters = {
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

        const response = await client.path("/translate").post({
          body: dataBatch,
          headers,
          queryParameters,
        });

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
