import { debug } from "@actions/core";
import { v2 } from "@google-cloud/translate";
import { AvailableTranslations } from "../../abstractions/available-translations";
import { TranslateOptions } from "../../abstractions/translate-options";
import { Inputs } from "../../action/inputs";
import { chunk } from "../../helpers/utils";
import {
  BaseProviderContext,
  BaseTranslationProvider,
} from "../shared/base-translation-provider";

const { Translate } = v2;

type TranslateConfig = NonNullable<ConstructorParameters<typeof Translate>[0]>;
type Credentials = TranslateConfig["credentials"];

/** Google v2 REST accepts up to 128 text segments per request; stay under it. */
const MAX_SEGMENTS_PER_REQUEST = 100;

/**
 * Google Cloud Translation (v2) provider (`@google-cloud/translate`).
 *
 * Authenticates with either an API key or a service-account JSON credential
 * (both are supported). Unlike AWS, the v2 client accepts an array of strings
 * per request, so a whole file's values are sent in a handful of batched
 * requests.
 *
 * Intent-specifier mapping: the action's `textType` maps to Google's `format`.
 * Google v2 defaults `format` to `html` (which HTML-escapes plain strings), so
 * we always send `text` unless `textType: html` is requested — matching the
 * Azure "plain" default. Google Cloud Translation v2 has no `profanityAction`
 * or Custom-Translator `categoryId` equivalent (glossaries/models are a v3
 * feature), so those specifiers are ignored for Google.
 */
export class GoogleTranslationProvider extends BaseTranslationProvider {
  readonly name = "google";
  private readonly apiKey?: string;
  private readonly credentials?: Credentials;
  private readonly projectId?: string;
  private readonly format: "text" | "html";
  private readonly model?: string;
  private readonly apiEndpoint?: string;
  private readonly autoRetry?: boolean;
  private cachedClient?: InstanceType<typeof Translate>;

  constructor(inputs: Inputs, context: BaseProviderContext = {}) {
    super({ sourceLocale: inputs.sourceLocale, ...context });

    this.apiKey = inputs.googleApiKey || undefined;
    this.projectId = inputs.googleProjectId || undefined;
    this.model = inputs.googleModel || undefined;
    this.apiEndpoint = inputs.googleApiEndpoint || undefined;
    this.autoRetry = inputs.googleAutoRetry;
    // Map textType -> Google format; default to "text" to match Azure's plain
    // default and avoid Google v2's html-default entity escaping.
    this.format = inputs.textType === "html" ? "html" : "text";
    if (inputs.googleCredentials) {
      try {
        this.credentials = JSON.parse(inputs.googleCredentials) as Credentials;
      } catch {
        // Defensive: get-inputs validation should already have caught this.
        throw new Error(
          "Input 'googleCredentials' must be valid JSON (a Google Cloud service-account key).",
        );
      }
    }
    if (!this.apiKey && !this.credentials) {
      throw new Error(
        "Provider 'google' requires either 'googleApiKey' or 'googleCredentials' (service-account JSON).",
      );
    }
  }

  private client(options?: TranslateOptions): InstanceType<typeof Translate> {
    if (!this.cachedClient) {
      this.cachedClient = new Translate({
        ...(this.apiKey ? { key: this.apiKey } : {}),
        ...(this.credentials ? { credentials: this.credentials } : {}),
        ...(this.projectId ? { projectId: this.projectId } : {}),
        ...(this.apiEndpoint ? { apiEndpoint: this.apiEndpoint } : {}),
        ...(this.autoRetry !== undefined ? { autoRetry: this.autoRetry } : {}),
        ...(options?.maxRetries !== undefined
          ? { maxRetries: options.maxRetries }
          : {}),
      });
    }
    return this.cachedClient;
  }

  async getAvailableTranslations(): Promise<AvailableTranslations> {
    const [languages] = await this.client().getLanguages();
    const translation: AvailableTranslations["translation"] = {};
    for (const language of languages) {
      if (!language.code) continue;
      const name = language.name ?? language.code;
      translation[language.code] = { name, nativeName: name, dir: "ltr" };
    }
    return { translation };
  }

  protected async translateStrings(
    texts: string[],
    toLocale: string,
    options?: TranslateOptions,
  ): Promise<string[]> {
    const client = this.client(options);
    debug(`[google] Translating ${texts.length} string(s) into '${toLocale}'.`);

    const results: string[] = [];
    for (const segment of chunk(texts, MAX_SEGMENTS_PER_REQUEST)) {
      if (segment.length === 0) continue;
      const [translated] = await client.translate(segment, {
        format: this.format,
        ...(this.sourceLocale ? { from: this.sourceLocale } : {}),
        ...(this.model ? { model: this.model } : {}),
        to: toLocale,
      });
      const arr = Array.isArray(translated) ? translated : [translated];
      results.push(...arr);
    }
    return results;
  }
}
