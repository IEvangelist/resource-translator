import { getBooleanInput, getInput } from "@actions/core";
import { Inputs } from "./inputs";
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
    dryRun: getOptionalBoolean("dryRun", false),
    failOnError: getOptionalBoolean("failOnError", true),
  };

  validate(inputs);

  const config = loadRepoConfig(inputs.configPath);
  return mergeInputsAndConfig(inputs, config);
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

const getOptionalBoolean = (name: string, defaultValue: boolean): boolean => {
  const raw = getInput(name);
  if (!raw) return defaultValue;
  try {
    return getBooleanInput(name);
  } catch {
    return defaultValue;
  }
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
