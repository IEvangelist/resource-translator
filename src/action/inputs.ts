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
}

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
   * Azure AI Translator resource subscription key. Store as GitHub secret.
   */
  subscriptionKey: string;

  /**
   * Azure AI Translator resource endpoint. Store as GitHub secret.
   */
  endpoint: string;

  /**
   * Source locale (required at runtime after input/config merge).
   */
  sourceLocale: string;

  /**
   * Azure AI Translator region (optional for global resources).
   */
  region?: string;

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
