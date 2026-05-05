export interface TranslatorResource {
  endpoint: string;
  subscriptionKey: string;
  region?: string;
  /** Translator REST API version. Defaults to "3.0" when not set. */
  apiVersion?: string;
  /** Custom Translator category ID, forwarded as the `category` query param. */
  categoryId?: string;
}
