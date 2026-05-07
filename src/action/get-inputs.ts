import { getBooleanInput, getInput } from "@actions/core";
import {
  Inputs,
  PROFANITY_ACTIONS,
  PROFANITY_MARKERS,
  ProfanityAction,
  ProfanityMarker,
  RepoConfig,
  TEXT_TYPES,
  TextType,
} from "./inputs";
import { loadRepoConfig, mergeInputsAndConfig } from "./load-config";

export const getInputs = (): Inputs => {
  const inputs: Inputs = {
    subscriptionKey: getInput("subscriptionKey", { required: true }),
    endpoint: getInput("endpoint", { required: true }),
    sourceLocale: getInput("sourceLocale", { required: true }),
    region: getInput("region"),
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
    dryRun: getOptionalBoolean("dryRun", false),
    failOnError: getOptionalBoolean("failOnError", true),
  };

  validate(inputs);

  const config = loadRepoConfig(inputs.configPath);
  const merged = mergeInputsAndConfig(inputs, config);
  validateMerged(merged);
  return merged;
};

const validate = (inputs: Inputs) => {
  if (!inputs.endpoint || !/^https?:\/\//i.test(inputs.endpoint)) {
    throw new Error(
      `Input 'endpoint' must be a valid http(s) URL. Got: ${inputs.endpoint}`,
    );
  }
  if (!inputs.subscriptionKey || inputs.subscriptionKey.length < 16) {
    throw new Error(
      `Input 'subscriptionKey' looks invalid (minimum 16 characters expected).`,
    );
  }
  if (!inputs.sourceLocale) {
    throw new Error(`Input 'sourceLocale' is required.`);
  }
};

/**
 * Validations applied after action inputs and the YAML repo config have been
 * merged. These cover values that may originate from either source so a typo
 * in `.github/resource-translator.yml` fails fast instead of producing a
 * Translator 400 deep in a run.
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

  oneOf("textType", TEXT_TYPES);
  oneOf("profanityAction", PROFANITY_ACTIONS);
  oneOf("profanityMarker", PROFANITY_MARKERS);

  if (inputs.profanityMarker && inputs.profanityAction !== "Marked") {
    throw new Error(
      `'profanityMarker' is only meaningful when 'profanityAction' is 'Marked'. Got profanityAction='${
        inputs.profanityAction ?? "undefined"
      }'.`,
    );
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
