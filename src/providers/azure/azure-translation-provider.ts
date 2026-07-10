import { AvailableTranslations } from "../../abstractions/available-translations";
import { TranslateOptions } from "../../abstractions/translate-options";
import { TranslationResultSet } from "../../abstractions/translation-results";
import { TranslatorResource } from "../../abstractions/translator-resource";
import { Inputs } from "../../action/inputs";
import { getAvailableTranslations, translate } from "../../api/translation-api";
import { TranslationProvider } from "../translation-provider";

/**
 * Azure AI Translator provider. This is a thin adapter over the original,
 * battle-tested `api/translation-api` implementation — it is intentionally
 * NOT built on {@link BaseTranslationProvider} so the proven multi-locale
 * batching, retry, and placeholder handling (and its extensive test suite)
 * remain byte-for-byte unchanged. It still produces the same normalized
 * {@link TranslationResultSet} every other provider produces.
 */
export class AzureTranslationProvider implements TranslationProvider {
  readonly name = "azure";
  private readonly resource: TranslatorResource;

  constructor(inputs: Inputs) {
    this.resource = {
      // Validated as present for provider=azure in get-inputs.ts.
      endpoint: inputs.endpoint as string,
      subscriptionKey: inputs.subscriptionKey as string,
      region: inputs.region,
      apiVersion: inputs.apiVersion,
      categoryId: inputs.categoryId,
      sourceLocale: inputs.sourceLocale,
      textType: inputs.textType,
      profanityAction: inputs.profanityAction,
      profanityMarker: inputs.profanityMarker,
      allowFallback: inputs.allowFallback,
    };
  }

  getAvailableTranslations(): Promise<AvailableTranslations> {
    return getAvailableTranslations(this.resource.apiVersion);
  }

  translate(
    toLocales: string[],
    translatableText: Map<string, string>,
    filePath: string,
    options?: TranslateOptions,
  ): Promise<TranslationResultSet | undefined> {
    return translate(
      this.resource,
      toLocales,
      translatableText,
      filePath,
      options,
    );
  }
}
