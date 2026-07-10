import { debug, setFailed } from "@actions/core";
import { AvailableTranslations } from "../../abstractions/available-translations";
import { TranslateOptions } from "../../abstractions/translate-options";
import { TranslationResultSet } from "../../abstractions/translation-results";
import { protect, restore } from "../../helpers/placeholders";
import { TranslationProvider } from "../translation-provider";

export interface BaseProviderContext {
  /** Source locale, forwarded to the vendor as the `from` hint when set. */
  sourceLocale?: string;
  /**
   * Per-text hard limit (stringified length) used for pre-flight validation.
   * Defaults to 10,000 to match the historical Azure behavior; vendors with a
   * larger request budget may raise it.
   */
  maxCharactersPerText?: number;
}

/**
 * Template-method base shared by the non-Azure providers (AWS, Google). It
 * owns every vendor-agnostic concern so all providers behave identically:
 *
 *   1. pre-flight per-text length validation (same fail-fast as Azure),
 *   2. placeholder protect/restore (so no vendor mangles `{{name}}`, `{0}`, ...),
 *   3. assembly of the normalized {@link TranslationResultSet}, and
 *   4. uniform error handling (`setFailed` + `undefined`, matching Azure).
 *
 * Subclasses implement only the two vendor primitives: {@link listLocales-like
 * getAvailableTranslations} and {@link translateStrings}. The Azure provider
 * deliberately does NOT extend this base — it keeps its own proven multi-locale
 * batching path — but it produces the same {@link TranslationResultSet}, so the
 * observable behavior is the same across all three vendors.
 */
export abstract class BaseTranslationProvider implements TranslationProvider {
  abstract readonly name: string;
  protected readonly sourceLocale?: string;
  protected readonly maxCharactersPerText: number;

  protected constructor(context: BaseProviderContext = {}) {
    this.sourceLocale = context.sourceLocale;
    this.maxCharactersPerText = context.maxCharactersPerText ?? 10000;
  }

  abstract getAvailableTranslations(): Promise<AvailableTranslations>;

  /**
   * Vendor primitive: translate `texts` (already placeholder-protected, in
   * order) into a single `toLocale`, returning translated strings in the SAME
   * order and length as the input. Implementations own their own
   * batching/concurrency and SDK-level retry configuration.
   */
  protected abstract translateStrings(
    texts: string[],
    toLocale: string,
    options?: TranslateOptions,
  ): Promise<string[]>;

  async translate(
    toLocales: string[],
    translatableText: Map<string, string>,
    filePath: string,
    options?: TranslateOptions,
  ): Promise<TranslationResultSet | undefined> {
    try {
      const keys = [...translatableText.keys()];
      const values = [...translatableText.values()];

      // Pre-flight length validation, mirroring the Azure provider so callers
      // get the same fail-fast behavior regardless of the selected vendor.
      const validationErrors: string[] = [];
      values.forEach((value, i) => {
        const length = JSON.stringify(value).length;
        if (length > this.maxCharactersPerText) {
          validationErrors.push(
            `Text for key '${keys[i]}' in file '${filePath}' is too long (${length}). Must be ${this.maxCharactersPerText} at most.`,
          );
        }
      });
      if (validationErrors.length) {
        setFailed(validationErrors.join("\r\n"));
        return undefined;
      }

      // Protect placeholders once per source value; the sentinel map at index
      // i applies to every locale's translation of values[i].
      const protectEnabled = options?.protectPlaceholders !== false;
      const sentinelMaps: Array<Map<string, string>> = [];
      const protectedValues = values.map((value) => {
        if (!protectEnabled) {
          sentinelMaps.push(new Map());
          return value;
        }
        const { protected: p, tokens } = protect(
          value,
          options?.customPlaceholderPatterns,
        );
        sentinelMaps.push(tokens);
        return p;
      });

      const resultSet: TranslationResultSet = {};
      for (const locale of toLocales) {
        const translated = await this.translateStrings(
          protectedValues,
          locale,
          options,
        );

        const localeResult: { [key: string]: string } = {};
        for (let i = 0; i < keys.length; i++) {
          let text = translated[i];
          // A vendor may drop/blank a row (common for low-resource locales).
          // Skip it so the file writer falls back to the source text, exactly
          // as the Azure result-set mapper does.
          if (typeof text !== "string" || text.length === 0) {
            continue;
          }
          if (protectEnabled) {
            text = restore(text, sentinelMaps[i]);
          }
          localeResult[keys[i]] = text;
        }
        resultSet[locale] = localeResult;

        debug(
          `[${this.name}] Translated ${keys.length} key(s) into '${locale}' for ${filePath}.`,
        );
      }

      return resultSet;
    } catch (ex: unknown) {
      const message = ex instanceof Error ? ex.message : String(ex);
      setFailed(`Failed to translate input: file '${filePath}', ${message}`);
      return undefined;
    }
  }
}
