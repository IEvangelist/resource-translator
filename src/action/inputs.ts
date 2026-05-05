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
  /** Azure AI Translator Custom Translator category ID. */
  categoryId?: string;
  /** Translator REST API version (defaults to "3.0"). */
  apiVersion?: string;
}

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
