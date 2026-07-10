import { debug } from "@actions/core";
import {
  ListLanguagesCommand,
  Profanity,
  TranslateClient,
  TranslateTextCommand,
  TranslationSettings,
} from "@aws-sdk/client-translate";
import { AvailableTranslations } from "../../abstractions/available-translations";
import { TranslateOptions } from "../../abstractions/translate-options";
import { Inputs } from "../../action/inputs";
import {
  BaseProviderContext,
  BaseTranslationProvider,
} from "../shared/base-translation-provider";
import { mapWithConcurrency } from "../shared/concurrency";

/** Max concurrent TranslateText calls. AWS translates one string per call. */
const MAX_CONCURRENCY = 5;

/**
 * AWS Translate provider (`@aws-sdk/client-translate`).
 *
 * AWS translates a single string into a single target language per request, so
 * we fan out with bounded concurrency. Credentials are optional: when explicit
 * key inputs are omitted, the AWS SDK's default credential provider chain is
 * used (OIDC via `aws-actions/configure-aws-credentials`, env vars, or an
 * instance role).
 *
 * Intent-specifier mapping: the action's `profanityAction` maps to AWS's
 * `Settings.Profanity`. AWS only supports masking, so any profanity handling
 * other than "NoAction" is mapped to `MASK`. AWS Translate has no plain/html
 * `textType` toggle and no direct Custom-Translator `categoryId` equivalent in
 * this SDK surface (custom terminology is a separate feature), so those
 * specifiers are ignored for AWS.
 */
export class AwsTranslationProvider extends BaseTranslationProvider {
  readonly name = "aws";
  private readonly region: string;
  private readonly credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  private readonly settings?: TranslationSettings;
  private cachedClient?: TranslateClient;

  constructor(inputs: Inputs, context: BaseProviderContext = {}) {
    super({ sourceLocale: inputs.sourceLocale, ...context });

    const region =
      inputs.awsRegion ||
      process.env.AWS_REGION ||
      process.env.AWS_DEFAULT_REGION;
    if (!region) {
      // Defensive: get-inputs validation should already have caught this.
      throw new Error(
        "AWS region is required. Set the 'awsRegion' input or the AWS_REGION environment variable.",
      );
    }
    this.region = region;

    if (inputs.awsAccessKeyId && inputs.awsSecretAccessKey) {
      this.credentials = {
        accessKeyId: inputs.awsAccessKeyId,
        secretAccessKey: inputs.awsSecretAccessKey,
        ...(inputs.awsSessionToken
          ? { sessionToken: inputs.awsSessionToken }
          : {}),
      };
    }

    // Map our profanity specifier onto AWS. AWS only offers masking, so both
    // "Marked" and "Deleted" collapse to MASK; "NoAction"/unset leaves it off.
    if (
      inputs.profanityAction === "Marked" ||
      inputs.profanityAction === "Deleted"
    ) {
      this.settings = { Profanity: Profanity.MASK };
    }
  }

  private client(options?: TranslateOptions): TranslateClient {
    if (!this.cachedClient) {
      // AWS SDK retry is client-level; `maxAttempts` counts the initial call,
      // so total attempts = 1 + maxRetries to mirror the other providers.
      const maxAttempts =
        options?.maxRetries !== undefined
          ? Math.max(1, options.maxRetries + 1)
          : undefined;
      this.cachedClient = new TranslateClient({
        region: this.region,
        ...(this.credentials ? { credentials: this.credentials } : {}),
        ...(maxAttempts ? { maxAttempts } : {}),
      });
    }
    return this.cachedClient;
  }

  async getAvailableTranslations(): Promise<AvailableTranslations> {
    const client = this.client();
    const translation: AvailableTranslations["translation"] = {};
    let nextToken: string | undefined;

    do {
      const response = await client.send(
        new ListLanguagesCommand({
          DisplayLanguageCode: "en",
          ...(nextToken ? { NextToken: nextToken } : {}),
        }),
      );
      for (const language of response.Languages ?? []) {
        if (!language.LanguageCode) continue;
        const name = language.LanguageName ?? language.LanguageCode;
        translation[language.LanguageCode] = {
          name,
          nativeName: name,
          dir: "ltr",
        };
      }
      nextToken = response.NextToken;
    } while (nextToken);

    return { translation };
  }

  protected async translateStrings(
    texts: string[],
    toLocale: string,
    options?: TranslateOptions,
  ): Promise<string[]> {
    const client = this.client(options);
    // AWS requires a source language code; use the configured source locale or
    // fall back to auto-detection.
    const source = this.sourceLocale || "auto";

    debug(
      `[aws] Translating ${texts.length} string(s) into '${toLocale}' (source '${source}').`,
    );

    return mapWithConcurrency(texts, MAX_CONCURRENCY, async (text) => {
      // AWS TranslateText rejects empty input; treat blanks as untranslated so
      // the base class falls back to the source text.
      if (!text) return "";
      const response = await client.send(
        new TranslateTextCommand({
          Text: text,
          SourceLanguageCode: source,
          TargetLanguageCode: toLocale,
          ...(this.settings ? { Settings: this.settings } : {}),
        }),
      );
      return response.TranslatedText ?? "";
    });
  }
}
