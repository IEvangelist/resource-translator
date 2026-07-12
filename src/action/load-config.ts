import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { warning, debug } from "@actions/core";
import * as yaml from "js-yaml";
import {
  AWS_FORMALITIES,
  AwsFormality,
  CHANGE_DETECTION_MODES,
  ChangeDetectionMode,
  PROFANITY_ACTIONS,
  PROFANITY_MARKERS,
  PROVIDERS,
  ProfanityAction,
  ProfanityMarker,
  Provider,
  RawRepoConfig,
  RepoConfig,
  TEXT_TYPES,
  TextType,
} from "./inputs";

/**
 * Loads `.github/resource-translator.yml` (or a custom `configPath`) from the
 * GitHub workspace and returns its parsed config. Returns `{}` if the file is
 * missing. When the file exists but cannot be parsed, the error is logged and
 * an empty config is returned so the action can fall back to its inputs.
 */
export const loadRepoConfig = (configPath?: string): RepoConfig => {
  const workspace = process.env["GITHUB_WORKSPACE"] ?? process.cwd();
  const relativePath = configPath?.trim() || ".github/resource-translator.yml";
  const fullPath = resolve(workspace, relativePath);

  if (!existsSync(fullPath)) {
    debug(`No repo config found at ${fullPath}.`);
    return {};
  }

  try {
    const text = readFileSync(fullPath, "utf-8");
    const parsed = yaml.load(text) as RawRepoConfig | null | undefined;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    debug(`Loaded repo config from ${fullPath}.`);
    return normalizeRepoConfig(parsed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    warning(`Failed to load repo config at ${fullPath}: ${message}`);
    return {};
  }
};

/**
 * Tolerates strings or arrays for include/exclude/toLocales and trims values.
 */
const normalizeRepoConfig = (raw: RawRepoConfig): RepoConfig => {
  const stringList = (value: unknown): string[] | undefined => {
    if (!value) return undefined;
    if (Array.isArray(value))
      return value.map((v) => String(v).trim()).filter(Boolean);
    if (typeof value === "string")
      return value
        .split(/\r?\n|,/)
        .map((v) => v.trim())
        .filter(Boolean);
    return undefined;
  };

  const enumOf = <T extends string>(
    value: unknown,
    allowed: readonly T[],
  ): T | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return allowed.includes(trimmed as T) ? (trimmed as T) : undefined;
  };

  const booleanOrUndefined = (value: unknown): boolean | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (["true", "yes", "on", "1"].includes(v)) return true;
      if (["false", "no", "off", "0"].includes(v)) return false;
    }
    return undefined;
  };

  const nonNegativeInt = (value: unknown): number | undefined => {
    if (value === undefined || value === null || value === "") return undefined;
    const n =
      typeof value === "number" ? value : Number.parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return n;
  };

  const changeDetection = (value: unknown): ChangeDetectionMode | undefined => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value ? "smart" : "disabled";
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (["true", "yes", "on", "1", "smart", "enabled"].includes(v)) {
        return "smart";
      }
      if (["false", "no", "off", "0", "disabled", "disable"].includes(v)) {
        return "disabled";
      }
    }
    return enumOf<ChangeDetectionMode>(value, CHANGE_DETECTION_MODES);
  };

  const awsFormality = (value: unknown): AwsFormality | undefined => {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim().toUpperCase();
    return AWS_FORMALITIES.includes(normalized as AwsFormality)
      ? (normalized as AwsFormality)
      : undefined;
  };

  const stringOrUndefined = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  };

  const providerConfig = normalizeProviderConfig(raw.provider);

  return {
    provider:
      providerConfig.provider ??
      (typeof raw.provider === "string"
        ? enumOf<Provider>(raw.provider, PROVIDERS)
        : undefined),
    subscriptionKey:
      stringOrUndefined(raw.subscriptionKey) ?? providerConfig.subscriptionKey,
    endpoint: stringOrUndefined(raw.endpoint) ?? providerConfig.endpoint,
    region: stringOrUndefined(raw.region) ?? providerConfig.region,
    awsAccessKeyId:
      stringOrUndefined(raw.awsAccessKeyId) ?? providerConfig.awsAccessKeyId,
    awsSecretAccessKey:
      stringOrUndefined(raw.awsSecretAccessKey) ??
      providerConfig.awsSecretAccessKey,
    awsSessionToken:
      stringOrUndefined(raw.awsSessionToken) ?? providerConfig.awsSessionToken,
    awsRegion: stringOrUndefined(raw.awsRegion) ?? providerConfig.awsRegion,
    awsFormality: awsFormality(raw.awsFormality) ?? providerConfig.awsFormality,
    awsBrevity: booleanOrUndefined(raw.awsBrevity) ?? providerConfig.awsBrevity,
    awsTerminologyNames:
      stringList(raw.awsTerminologyNames) ?? providerConfig.awsTerminologyNames,
    awsParallelDataNames:
      stringList(raw.awsParallelDataNames) ??
      providerConfig.awsParallelDataNames,
    googleApiKey:
      stringOrUndefined(raw.googleApiKey) ?? providerConfig.googleApiKey,
    googleCredentials:
      stringOrUndefined(raw.googleCredentials) ??
      providerConfig.googleCredentials,
    googleProjectId:
      stringOrUndefined(raw.googleProjectId) ?? providerConfig.googleProjectId,
    googleModel:
      stringOrUndefined(raw.googleModel) ?? providerConfig.googleModel,
    googleApiEndpoint:
      stringOrUndefined(raw.googleApiEndpoint) ??
      providerConfig.googleApiEndpoint,
    googleAutoRetry:
      booleanOrUndefined(raw.googleAutoRetry) ?? providerConfig.googleAutoRetry,
    sourceLocale:
      typeof raw.sourceLocale === "string" ? raw.sourceLocale : undefined,
    toLocales: stringList(raw.toLocales),
    include: stringList(raw.include),
    exclude: stringList(raw.exclude),
    glossary:
      raw.glossary && typeof raw.glossary === "object"
        ? (raw.glossary as Record<string, string>)
        : undefined,
    categoryId:
      typeof raw.categoryId === "string"
        ? raw.categoryId
        : providerConfig.categoryId,
    apiVersion:
      typeof raw.apiVersion === "string"
        ? raw.apiVersion
        : providerConfig.apiVersion,
    textType: enumOf<TextType>(raw.textType, TEXT_TYPES),
    profanityAction: enumOf<ProfanityAction>(
      raw.profanityAction,
      PROFANITY_ACTIONS,
    ),
    profanityMarker: enumOf<ProfanityMarker>(
      raw.profanityMarker,
      PROFANITY_MARKERS,
    ),
    allowFallback:
      booleanOrUndefined(raw.allowFallback) ?? providerConfig.allowFallback,
    noTranslatePatterns: stringList(raw.noTranslatePatterns),
    protectPlaceholders: booleanOrUndefined(raw.protectPlaceholders),
    customPlaceholderPatterns: stringList(raw.customPlaceholderPatterns),
    maxRetries: nonNegativeInt(raw.maxRetries),
    retryBackoffMs: nonNegativeInt(raw.retryBackoffMs),
    changeDetection: changeDetection(raw.changeDetection),
    statePath: typeof raw.statePath === "string" ? raw.statePath : undefined,
  };
};

export const normalizeProviderConfig = (
  provider: unknown,
  onInvalid: (message: string) => void = warning,
): Partial<RepoConfig> => {
  const stringOrUndefined = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  };

  const booleanOrUndefined = (value: unknown): boolean | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (["true", "yes", "on", "1"].includes(v)) return true;
      if (["false", "no", "off", "0"].includes(v)) return false;
    }
    return undefined;
  };

  const stringList = (value: unknown): string[] | undefined => {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      const list = value.map((v) => String(v).trim()).filter(Boolean);
      return list.length ? list : undefined;
    }
    if (typeof value === "string") {
      const list = value
        .split(/\r?\n|,/)
        .map((v) => v.trim())
        .filter(Boolean);
      return list.length ? list : undefined;
    }
    return undefined;
  };

  const awsFormality = (value: unknown): AwsFormality | undefined => {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim().toUpperCase();
    if (AWS_FORMALITIES.includes(normalized as AwsFormality)) {
      return normalized as AwsFormality;
    }
    if (normalized) {
      onInvalid(
        `Invalid AWS formality '${value}'. Expected one of: ${AWS_FORMALITIES.join(", ")}.`,
      );
    }
    return undefined;
  };

  const recordOrUndefined = (
    value: unknown,
  ): Record<string, unknown> | undefined =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;

  if (typeof provider === "string") {
    const trimmed = provider.trim();
    if (!trimmed) return {};
    if (PROVIDERS.includes(trimmed as Provider)) {
      return { provider: trimmed as Provider };
    }
    onInvalid(
      `Invalid provider config '${trimmed}'. Expected one of: ${PROVIDERS.join(", ")}, or a nested provider block.`,
    );
    return {};
  }

  const providerObject = recordOrUndefined(provider);
  if (!providerObject) return {};

  const selectedProviders = PROVIDERS.filter((name) =>
    Object.prototype.hasOwnProperty.call(providerObject, name),
  );

  if (selectedProviders.length !== 1) {
    onInvalid(
      `Nested provider config must contain exactly one of: ${PROVIDERS.join(", ")}.`,
    );
    return {};
  }

  const selectedProvider = selectedProviders[0];
  const settings = recordOrUndefined(providerObject[selectedProvider]) ?? {};

  switch (selectedProvider) {
    case "azure":
      return {
        provider: "azure",
        subscriptionKey: stringOrUndefined(settings.subscriptionKey),
        endpoint: stringOrUndefined(settings.endpoint),
        region: stringOrUndefined(settings.region),
        categoryId: stringOrUndefined(settings.categoryId),
        apiVersion: stringOrUndefined(settings.apiVersion),
        allowFallback: booleanOrUndefined(settings.allowFallback),
      };
    case "aws":
      return {
        provider: "aws",
        awsAccessKeyId:
          stringOrUndefined(settings.accessKeyId) ??
          stringOrUndefined(settings.awsAccessKeyId),
        awsSecretAccessKey:
          stringOrUndefined(settings.secretAccessKey) ??
          stringOrUndefined(settings.awsSecretAccessKey),
        awsSessionToken:
          stringOrUndefined(settings.sessionToken) ??
          stringOrUndefined(settings.awsSessionToken),
        awsRegion:
          stringOrUndefined(settings.region) ??
          stringOrUndefined(settings.awsRegion),
        awsFormality:
          awsFormality(settings.formality) ??
          awsFormality(settings.awsFormality),
        awsBrevity:
          booleanOrUndefined(settings.brevity) ??
          booleanOrUndefined(settings.awsBrevity),
        awsTerminologyNames:
          stringList(settings.terminologyNames) ??
          stringList(settings.awsTerminologyNames),
        awsParallelDataNames:
          stringList(settings.parallelDataNames) ??
          stringList(settings.awsParallelDataNames),
      };
    case "google":
      return {
        provider: "google",
        googleApiKey:
          stringOrUndefined(settings.apiKey) ??
          stringOrUndefined(settings.googleApiKey),
        googleCredentials:
          stringOrUndefined(settings.credentials) ??
          stringOrUndefined(settings.googleCredentials),
        googleProjectId:
          stringOrUndefined(settings.projectId) ??
          stringOrUndefined(settings.googleProjectId),
        googleModel:
          stringOrUndefined(settings.model) ??
          stringOrUndefined(settings.googleModel),
        googleApiEndpoint:
          stringOrUndefined(settings.apiEndpoint) ??
          stringOrUndefined(settings.googleApiEndpoint),
        googleAutoRetry:
          booleanOrUndefined(settings.autoRetry) ??
          booleanOrUndefined(settings.googleAutoRetry),
      };
  }
};

/**
 * Merges action inputs over a repo config. Action inputs always win when set;
 * otherwise the repo config value is used.
 */
export const mergeInputsAndConfig = <T extends RepoConfig>(
  inputs: T,
  config: RepoConfig,
): T => {
  const merged: T = { ...inputs };
  const keys: (keyof RepoConfig)[] = [
    "provider",
    "subscriptionKey",
    "endpoint",
    "region",
    "awsAccessKeyId",
    "awsSecretAccessKey",
    "awsSessionToken",
    "awsRegion",
    "awsFormality",
    "awsBrevity",
    "awsTerminologyNames",
    "awsParallelDataNames",
    "googleApiKey",
    "googleCredentials",
    "googleProjectId",
    "googleModel",
    "googleApiEndpoint",
    "googleAutoRetry",
    "sourceLocale",
    "toLocales",
    "include",
    "exclude",
    "glossary",
    "categoryId",
    "apiVersion",
    "textType",
    "profanityAction",
    "profanityMarker",
    "allowFallback",
    "noTranslatePatterns",
    "protectPlaceholders",
    "customPlaceholderPatterns",
    "maxRetries",
    "retryBackoffMs",
    "changeDetection",
    "statePath",
  ];
  for (const key of keys) {
    if (merged[key] === undefined || isEmpty(merged[key])) {
      const fromConfig = config[key];
      if (fromConfig !== undefined && !isEmpty(fromConfig)) {
        (merged as Record<string, unknown>)[key] = fromConfig;
      }
    }
  }
  return merged;
};

const isEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === "boolean") return false;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};
