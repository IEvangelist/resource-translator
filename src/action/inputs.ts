/** Supported translation vendors. One vendor is selected per action call. */
export type Provider = "azure" | "aws" | "google";

/** Translator request text type. */
export type TextType = "plain" | "html";

/** Translator profanity handling. */
export type ProfanityAction = "NoAction" | "Marked" | "Deleted";

/** Translator profanity marker (only meaningful when profanityAction is "Marked"). */
export type ProfanityMarker = "Asterisk" | "Tag";

/**
 * Optional repo-level configuration that can be supplied either via action
 * inputs or via a YAML file at `.github/resource-translator.yml`. Action
 * inputs always win when both are provided.
 */
export interface RepoConfig {
  /**
   * Translation vendor to use for this run: "azure" (default), "aws", or
   * "google". Exactly one vendor is used per action call. Can be set here or
   * via the `provider` action input (the input wins).
   */
  provider?: Provider;
  /** Source locale (used as the glob discriminator in resource file names). */
  sourceLocale?: string;
  /** Locales to translate to. When omitted every supported locale is targeted. */
  toLocales?: string[];
  /** Newline-separated glob patterns of files to include. */
  include?: string[];
  /** Newline-separated glob patterns of files to exclude (applied after include). */
  exclude?: string[];
  /** Post-translation term overrides (term -> replacement). */
  glossary?: Record<string, string>;
  /**
   * Azure AI Translator Custom Translator category ID. Use this to scope
   * translations to a domain/industry (e.g. legal, technology, healthcare)
   * via a Custom Translator project trained on that corpus.
   */
  categoryId?: string;
  /** Translator REST API version (defaults to "3.0"). */
  apiVersion?: string;
  /**
   * Translator request text type. Defaults to "plain". Use "html" only when
   * the resource values are real HTML fragments (Translator preserves tags
   * and attributes; plain text input passed as html may be over-escaped).
   */
  textType?: TextType;
  /**
   * Profanity-handling strategy. "NoAction" (default upstream) returns
   * profane terms as translated; "Deleted" removes them; "Marked" wraps
   * them with `profanityMarker`.
   */
  profanityAction?: ProfanityAction;
  /**
   * How to mark profanity when `profanityAction` is "Marked". Ignored
   * otherwise. Defaults upstream to "Asterisk".
   */
  profanityMarker?: ProfanityMarker;
  /**
   * When false, Translator will not fall back to the general system if the
   * requested category does not have a deployment for a target locale —
   * instead it returns an error. When undefined (default), Translator's own
   * default applies (allow fallback).
   */
  allowFallback?: boolean;

  /**
   * Newline-separated glob patterns matched against parser key paths
   * (`name` for resx, `msgid` for po, unit `id` for xliff, `[--]`-joined
   * paths for json, raw key for ini/restext). Matching keys are kept
   * verbatim from the source and never sent to Translator. Useful for
   * brand names, technical IDs, or any value where machine translation
   * would corrupt meaning.
   */
  noTranslatePatterns?: string[];

  /**
   * When true (default), wrap common placeholder tokens (`{{name}}`, `{0}`,
   * `%s`, `${var}`, ...) in stable sentinels before sending text to
   * Translator and unwrap them afterwards. This prevents Azure from
   * rearranging or translating placeholder names, which otherwise breaks
   * runtime formatting in localized output. Disable only if your source
   * text explicitly contains literal sequences that look like placeholders.
   */
  protectPlaceholders?: boolean;

  /**
   * Optional extra regex patterns (raw source strings, no surrounding
   * slashes) added to the placeholder protector. Each pattern is compiled
   * with the global flag if it is not already supplied. Invalid regex
   * patterns are skipped silently.
   */
  customPlaceholderPatterns?: string[];

  /**
   * Maximum number of additional retry attempts on transient Translator
   * failures (HTTP 408, 425, 429, 500, 502, 503, 504). The total number of
   * HTTP calls per request is `1 + maxRetries`. Defaults to 5.
   */
  maxRetries?: number;

  /**
   * Cap (ms) on any single backoff sleep between retries. The Azure-
   * supplied `Retry-After` header is honored exactly when present;
   * otherwise an exponentially growing jittered sleep is used, capped at
   * this value. Defaults to 30000ms (30s).
   */
  retryBackoffMs?: number;
}

/** Closed set of valid `provider` values for runtime validation. */
export const PROVIDERS: readonly Provider[] = [
  "azure",
  "aws",
  "google",
] as const;
/** Closed set of valid `textType` values for runtime validation. */
export const TEXT_TYPES: readonly TextType[] = ["plain", "html"] as const;
/** Closed set of valid `profanityAction` values for runtime validation. */
export const PROFANITY_ACTIONS: readonly ProfanityAction[] = [
  "NoAction",
  "Marked",
  "Deleted",
] as const;
/** Closed set of valid `profanityMarker` values for runtime validation. */
export const PROFANITY_MARKERS: readonly ProfanityMarker[] = [
  "Asterisk",
  "Tag",
] as const;

export interface Inputs extends RepoConfig {
  /**
   * Selected translation vendor. Always resolved to a concrete value
   * ("azure" by default) by `getInputs()`. Optional on the type so callers
   * constructing `Inputs` directly (e.g. tests) may omit it — the provider
   * factory treats an absent value as "azure".
   */
  provider?: Provider;

  /**
   * Azure AI Translator resource subscription key (provider=azure).
   * Store as a GitHub secret. Required when provider is "azure".
   */
  subscriptionKey?: string;

  /**
   * Azure AI Translator resource endpoint (provider=azure). Store as a
   * GitHub secret. Required when provider is "azure".
   */
  endpoint?: string;

  /**
   * Azure AI Translator region (optional for global resources).
   */
  region?: string;

  /**
   * AWS access key id (provider=aws). Optional — when omitted the AWS SDK's
   * default credential provider chain is used (e.g. OIDC via
   * `aws-actions/configure-aws-credentials`, env vars, or an instance role).
   */
  awsAccessKeyId?: string;

  /**
   * AWS secret access key (provider=aws). Store as a GitHub secret. Optional;
   * see {@link awsAccessKeyId}.
   */
  awsSecretAccessKey?: string;

  /**
   * AWS session token (provider=aws), for temporary credentials. Optional.
   */
  awsSessionToken?: string;

  /**
   * AWS region (provider=aws). Falls back to the `AWS_REGION` environment
   * variable when unset.
   */
  awsRegion?: string;

  /**
   * Google Cloud API key (provider=google). Store as a GitHub secret. Provide
   * either this or {@link googleCredentials}.
   */
  googleApiKey?: string;

  /**
   * Google Cloud service-account credentials as a JSON string (provider=google).
   * Store as a GitHub secret. Provide either this or {@link googleApiKey}.
   */
  googleCredentials?: string;

  /**
   * Google Cloud project id (provider=google). Optional — inferred from the
   * service-account credentials when those are supplied.
   */
  googleProjectId?: string;

  /**
   * Source locale (required at runtime after input/config merge).
   */
  sourceLocale: string;

  /**
   * Optional path to a YAML config file (relative to GITHUB_WORKSPACE).
   */
  configPath?: string;

  /**
   * When true, run translation logic but skip writing translated files.
   */
  dryRun?: boolean;

  /**
   * When true (default), unexpected errors fail the action; when false
   * they are logged as warnings and processing continues.
   */
  failOnError?: boolean;
}
