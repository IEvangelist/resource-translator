import { AvailableTranslations } from "../abstractions/available-translations";
import { TranslateOptions } from "../abstractions/translate-options";
import { TranslationResultSet } from "../abstractions/translation-results";

/**
 * The single, unified translation surface exposed to the rest of the action.
 *
 * Every vendor (Azure, AWS, Google) implements exactly these two calls, and
 * every implementation normalizes its results to the shared
 * {@link TranslationResultSet} shape. That normalization boundary is what lets
 * all downstream logic — file parsing, glossary, placeholder restore, writing,
 * and summaries — remain completely vendor-agnostic. Consumers select a vendor
 * once (via the `provider` input) and never branch on it again; the
 * `translationProviderFactory` buries the delegation behind this interface.
 */
export interface TranslationProvider {
  /**
   * The stable, lowercase provider identifier (e.g. "azure"). Used for logging
   * and diagnostics only — behavior must never branch on this value.
   */
  readonly name: string;

  /**
   * Returns the set of locales the configured vendor can translate into,
   * normalized to the shared {@link AvailableTranslations} shape. `start()`
   * uses this to compute the default target-locale set when the caller does
   * not pin `toLocales`.
   */
  getAvailableTranslations(): Promise<AvailableTranslations>;

  /**
   * Translates every value in `translatableText` into each locale in
   * `toLocales`, returning a normalized {@link TranslationResultSet} keyed by
   * locale then by the original text key. Returns `undefined` (after calling
   * `@actions/core`'s `setFailed`) when the vendor call fails, matching the
   * historical Azure contract so `start()`'s error handling is unchanged.
   */
  translate(
    toLocales: string[],
    translatableText: Map<string, string>,
    filePath: string,
    options?: TranslateOptions,
  ): Promise<TranslationResultSet | undefined>;
}
