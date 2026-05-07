import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { warning, debug } from "@actions/core";
import * as yaml from "js-yaml";
import {
  PROFANITY_ACTIONS,
  PROFANITY_MARKERS,
  ProfanityAction,
  ProfanityMarker,
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
    const parsed = yaml.load(text) as RepoConfig | null | undefined;
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
const normalizeRepoConfig = (raw: RepoConfig): RepoConfig => {
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

  return {
    sourceLocale:
      typeof raw.sourceLocale === "string" ? raw.sourceLocale : undefined,
    toLocales: stringList(raw.toLocales),
    include: stringList(raw.include),
    exclude: stringList(raw.exclude),
    glossary:
      raw.glossary && typeof raw.glossary === "object"
        ? (raw.glossary as Record<string, string>)
        : undefined,
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : undefined,
    apiVersion: typeof raw.apiVersion === "string" ? raw.apiVersion : undefined,
    textType: enumOf<TextType>(raw.textType, TEXT_TYPES),
    profanityAction: enumOf<ProfanityAction>(
      raw.profanityAction,
      PROFANITY_ACTIONS,
    ),
    profanityMarker: enumOf<ProfanityMarker>(
      raw.profanityMarker,
      PROFANITY_MARKERS,
    ),
    allowFallback: booleanOrUndefined(raw.allowFallback),
    noTranslatePatterns: stringList(raw.noTranslatePatterns),
    protectPlaceholders: booleanOrUndefined(raw.protectPlaceholders),
    customPlaceholderPatterns: stringList(raw.customPlaceholderPatterns),
    maxRetries: nonNegativeInt(raw.maxRetries),
    retryBackoffMs: nonNegativeInt(raw.retryBackoffMs),
  };
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
