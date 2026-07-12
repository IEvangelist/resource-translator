import { getBooleanInput, getInput } from "@actions/core";
import {
  CHANGE_DETECTION_MODES,
  ChangeDetectionMode,
  Inputs,
  PROFANITY_ACTIONS,
  PROFANITY_MARKERS,
  PROVIDERS,
  ProfanityAction,
  ProfanityMarker,
  Provider,
  RepoConfig,
  TEXT_TYPES,
  TextType,
} from "./inputs";
import { loadRepoConfig, mergeInputsAndConfig } from "./load-config";

export const getInputs = (): Inputs => {
  // Resolve provider precedence explicitly (input > config > default) below,
  // so capture the raw input value here rather than defaulting it early.
  const providerInput = getOptionalEnum<Provider>("provider", PROVIDERS);

  const inputs: Inputs = {
    provider: providerInput ?? "azure",
    // Azure credentials are only required when provider is "azure"; they are
    // validated per-provider after the config merge (see validateProvider).
    subscriptionKey: getInput("subscriptionKey") || undefined,
    endpoint: getInput("endpoint") || undefined,
    region: getInput("region"),
    // AWS credentials — all optional. When omitted, the AWS SDK's default
    // credential provider chain (OIDC/env/instance role) is used.
    awsAccessKeyId: getInput("awsAccessKeyId") || undefined,
    awsSecretAccessKey: getInput("awsSecretAccessKey") || undefined,
    awsSessionToken: getInput("awsSessionToken") || undefined,
    awsRegion: getInput("awsRegion") || undefined,
    // Google credentials — provide either an API key or service-account JSON.
    googleApiKey: getInput("googleApiKey") || undefined,
    googleCredentials: getInput("googleCredentials") || undefined,
    googleProjectId: getInput("googleProjectId") || undefined,
    sourceLocale: getInput("sourceLocale", { required: true }),
    toLocales: getQuestionableArray("toLocales"),
    include: getMultilineList("include"),
    exclude: getMultilineList("exclude"),
    configPath: getInput("configPath") || undefined,
    categoryId: getInput("categoryId") || undefined,
    apiVersion: getInput("apiVersion") || undefined,
    textType: getOptionalEnum<TextType>("textType", TEXT_TYPES),
    profanityAction: getOptionalEnum<ProfanityAction>(
      "profanityAction",
      PROFANITY_ACTIONS,
    ),
    profanityMarker: getOptionalEnum<ProfanityMarker>(
      "profanityMarker",
      PROFANITY_MARKERS,
    ),
    allowFallback: getOptionalBooleanOrUndefined("allowFallback"),
    noTranslatePatterns: getMultilineList("noTranslatePatterns"),
    protectPlaceholders: getOptionalBooleanOrUndefined("protectPlaceholders"),
    customPlaceholderPatterns: getMultilineList("customPlaceholderPatterns"),
    maxRetries: getOptionalInt("maxRetries"),
    retryBackoffMs: getOptionalInt("retryBackoffMs"),
    changeDetection: getOptionalChangeDetection("changeDetection"),
    statePath: getInput("statePath") || undefined,
    dryRun: getOptionalBoolean("dryRun", false),
    failOnError: getOptionalBoolean("failOnError", true),
    snapshotOnly: getOptionalBoolean("snapshotOnly", false),
  };

  const config = loadRepoConfig(inputs.configPath);
  const merged = mergeInputsAndConfig(inputs, config);
  // Provider precedence: explicit input wins, then repo config, then default.
  merged.provider = providerInput ?? config.provider ?? "azure";
  validateMerged(merged);
  return merged;
};

/**
 * Validations applied after action inputs and the YAML repo config have been
 * merged. These cover values that may originate from either source so a typo
 * in `.github/resource-translator.yml` fails fast instead of producing a
 * vendor 400 deep in a run.
 */
const validateMerged = (inputs: Inputs) => {
  const oneOf = <T extends string>(
    name: keyof RepoConfig,
    allowed: readonly T[],
  ) => {
    const value = inputs[name] as T | undefined;
    if (value !== undefined && !allowed.includes(value)) {
      throw new Error(
        `Invalid value for '${String(name)}': '${value}'. Expected one of: ${allowed.join(", ")}.`,
      );
    }
  };

  oneOf("provider", PROVIDERS);
  oneOf("textType", TEXT_TYPES);
  oneOf("profanityAction", PROFANITY_ACTIONS);
  oneOf("profanityMarker", PROFANITY_MARKERS);
  oneOf("changeDetection", CHANGE_DETECTION_MODES);

  if (inputs.profanityMarker && inputs.profanityAction !== "Marked") {
    throw new Error(
      `'profanityMarker' is only meaningful when 'profanityAction' is 'Marked'. Got profanityAction='${
        inputs.profanityAction ?? "undefined"
      }'.`,
    );
  }

  if (inputs.snapshotOnly && inputs.changeDetection === "disabled") {
    throw new Error(
      `'snapshotOnly' requires smart change detection. Remove 'snapshotOnly' or set 'changeDetection' to 'smart'.`,
    );
  }
  validateProvider(inputs);
};

/**
 * Provider-aware credential validation. Only the selected vendor's inputs are
 * required, so an Azure-only workflow keeps working unchanged while AWS/Google
 * workflows fail fast when their credentials are missing or malformed.
 */
const validateProvider = (inputs: Inputs) => {
  if (!inputs.sourceLocale) {
    throw new Error(`Input 'sourceLocale' is required.`);
  }

  if (inputs.snapshotOnly) {
    return;
  }

  switch (inputs.provider) {
    case "azure":
      validateAzure(inputs);
      break;
    case "aws":
      validateAws(inputs);
      break;
    case "google":
      validateGoogle(inputs);
      break;
  }
};

const validateAzure = (inputs: Inputs) => {
  if (!inputs.endpoint || !/^https?:\/\//i.test(inputs.endpoint)) {
    throw new Error(
      `Input 'endpoint' must be a valid http(s) URL when provider is 'azure'. Got: ${inputs.endpoint}`,
    );
  }
  if (!inputs.subscriptionKey || inputs.subscriptionKey.length < 16) {
    throw new Error(
      `Input 'subscriptionKey' looks invalid (minimum 16 characters expected) for provider 'azure'.`,
    );
  }
};

const validateAws = (inputs: Inputs) => {
  const region =
    inputs.awsRegion ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION;
  if (!region) {
    throw new Error(
      `Input 'awsRegion' is required when provider is 'aws' (or set the AWS_REGION environment variable, e.g. via aws-actions/configure-aws-credentials).`,
    );
  }
  // Credentials are optional — omitting both explicit keys falls back to the
  // AWS SDK default credential provider chain (OIDC role, env vars, instance
  // profile). A lone key id without its secret (or vice-versa) is a
  // misconfiguration worth failing fast on.
  const hasId = !!inputs.awsAccessKeyId;
  const hasSecret = !!inputs.awsSecretAccessKey;
  if (hasId !== hasSecret) {
    throw new Error(
      `Both 'awsAccessKeyId' and 'awsSecretAccessKey' must be supplied together for provider 'aws' (or omit both to use the default AWS credential chain / OIDC).`,
    );
  }
};

const validateGoogle = (inputs: Inputs) => {
  const hasApiKey = !!inputs.googleApiKey;
  const hasCredentials = !!inputs.googleCredentials;
  if (!hasApiKey && !hasCredentials) {
    throw new Error(
      `Provider 'google' requires either 'googleApiKey' or 'googleCredentials' (service-account JSON).`,
    );
  }
  if (hasCredentials) {
    try {
      JSON.parse(inputs.googleCredentials as string);
    } catch {
      throw new Error(
        `Input 'googleCredentials' must be valid JSON (a Google Cloud service-account key).`,
      );
    }
  }
};

const getOptionalBoolean = (name: string, defaultValue: boolean): boolean => {
  const raw = getInput(name);
  if (!raw) return defaultValue;
  try {
    return getBooleanInput(name);
  } catch {
    return defaultValue;
  }
};

/**
 * Reads a tri-state boolean input: returns `undefined` when the input is
 * missing, the parsed boolean otherwise. Used for inputs whose Translator
 * default is meaningful (e.g. `allowFallback`).
 */
const getOptionalBooleanOrUndefined = (name: string): boolean | undefined => {
  const raw = getInput(name);
  if (!raw) return undefined;
  try {
    return getBooleanInput(name);
  } catch {
    return undefined;
  }
};

const getOptionalEnum = <T extends string>(
  name: string,
  allowed: readonly T[],
): T | undefined => {
  const raw = getInput(name)?.trim();
  if (!raw) return undefined;
  if (!allowed.includes(raw as T)) {
    throw new Error(
      `Invalid value for '${name}': '${raw}'. Expected one of: ${allowed.join(", ")}.`,
    );
  }
  return raw as T;
};

const getOptionalChangeDetection = (
  name: string,
): ChangeDetectionMode | undefined => {
  const raw = getInput(name)?.trim();
  if (!raw) return undefined;
  const normalized = raw.toLowerCase();
  if (["true", "yes", "on", "1", "smart", "enabled"].includes(normalized)) {
    return "smart";
  }
  if (["false", "no", "off", "0", "disabled", "disable"].includes(normalized)) {
    return "disabled";
  }
  throw new Error(
    `Invalid value for '${name}': '${raw}'. Expected one of: ${CHANGE_DETECTION_MODES.join(", ")}, true, or false.`,
  );
};

const getMultilineList = (name: string): string[] | undefined => {
  const value = getInput(name);
  if (!value) return undefined;
  const list = value
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
};

/**
 * Reads a non-negative integer input. Returns `undefined` when the input is
 * empty so the downstream consumer can apply its own default. Invalid
 * non-empty values throw to fail fast on misconfiguration.
 */
const getOptionalInt = (name: string): number | undefined => {
  const raw = getInput(name)?.trim();
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(
      `Input '${name}' must be a non-negative integer. Got: '${raw}'.`,
    );
  }
  return n;
};

/**
 * Valid formats for parsing string into JS array:
 *   "'es','de','fr'"
 *   "[ 'es', 'de', 'fr' ]"
 */
export const getQuestionableArray = (
  inputName: string,
): string[] | undefined => {
  const value = getInput(inputName);
  if (value) {
    if (value.indexOf("[") > -1) {
      return [...JSON.parse(value)];
    } else {
      return value.replace(/\s/g, "").split(",");
    }
  }

  return undefined;
};
