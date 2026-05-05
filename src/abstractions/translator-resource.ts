import type {
  ProfanityAction,
  ProfanityMarker,
  TextType,
} from "../action/inputs";

export interface TranslatorResource {
  endpoint: string;
  subscriptionKey: string;
  region?: string;
  /** Translator REST API version. Defaults to "3.0" when not set. */
  apiVersion?: string;
  /** Custom Translator category ID, forwarded as the `category` query param. */
  categoryId?: string;
  /**
   * Source locale, forwarded as `from=<sourceLocale>` so Translator does not
   * have to autodetect on short strings. Defaults to undefined (autodetect).
   */
  sourceLocale?: string;
  /** Forwarded as `textType=<plain|html>` when set. */
  textType?: TextType;
  /** Forwarded as `profanityAction=<...>` when set. */
  profanityAction?: ProfanityAction;
  /** Forwarded as `profanityMarker=<...>` when set. */
  profanityMarker?: ProfanityMarker;
  /** Forwarded as `allowFallback=true|false` when set. */
  allowFallback?: boolean;
}
