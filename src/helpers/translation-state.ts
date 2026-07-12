import { warning } from "@actions/core";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, relative, resolve } from "path";
import { Inputs } from "../action/inputs";
import { TranslationFileKind } from "../abstractions/translation-file-kind";

export const TRANSLATION_STATE_SCHEMA_VERSION = 2;
export const DEFAULT_TRANSLATION_STATE_PATH =
  ".github/resource-translator-state.json";

export type TranslationStateLoadStatus = "loaded" | "missing" | "invalid";

export interface TranslationStateLoadResult {
  path: string;
  state: TranslationState;
  status: TranslationStateLoadStatus;
}

export interface TranslationState {
  schemaVersion: number;
  files: Record<string, TranslationStateFile>;
}

export interface TranslationStateFile {
  kind: TranslationFileKind;
  keys: string[];
  sourceHashes: string[];
  locales: Record<string, TranslationStateLocale>;
}

export interface TranslationStateLocale {
  targetPath: string;
  fingerprint: string;
  targetHashes: Array<string | null>;
}

export interface TranslationStateLocaleSnapshot {
  targetPath: string;
  keys: Record<string, TranslationStateKey>;
}

export interface TranslationStateKey {
  sourceHash: string;
  targetHash?: string;
  fingerprint: string;
}

export const createEmptyTranslationState = (): TranslationState => ({
  schemaVersion: TRANSLATION_STATE_SCHEMA_VERSION,
  files: {},
});

export const resolveStatePath = (statePath?: string): string => {
  const workspace = getWorkspaceRoot();
  const path = statePath?.trim() || DEFAULT_TRANSLATION_STATE_PATH;
  return isAbsolute(path) ? path : resolve(workspace, path);
};

export const normalizeStatePath = (filePath: string): string => {
  const workspace = getWorkspaceRoot();
  const absolute = isAbsolute(filePath)
    ? filePath
    : resolve(workspace, filePath);
  const rel = relative(workspace, absolute) || absolute;
  return rel.replace(/\\/g, "/");
};

export const loadTranslationState = (
  statePath?: string,
): TranslationStateLoadResult => {
  const path = resolveStatePath(statePath);
  if (!existsSync(path)) {
    return {
      path,
      state: createEmptyTranslationState(),
      status: "missing",
    };
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    if (!isTranslationState(parsed)) {
      warning(
        `Translation state at ${path} is incompatible with schema version ${TRANSLATION_STATE_SCHEMA_VERSION}; bootstrapping a new state file.`,
      );
      return {
        path,
        state: createEmptyTranslationState(),
        status: "invalid",
      };
    }

    return {
      path,
      state: parsed,
      status: "loaded",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    warning(
      `Failed to read translation state at ${path}: ${message}; bootstrapping a new state file.`,
    );
    return {
      path,
      state: createEmptyTranslationState(),
      status: "invalid",
    };
  }
};

export const saveTranslationState = (
  state: TranslationState,
  statePath?: string,
) => {
  const path = resolveStatePath(statePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${stableStringify(state)}\n`, "utf-8");
};

export const getTranslationLocaleState = (
  state: TranslationState,
  sourcePath: string,
  locale: string,
): TranslationStateLocaleSnapshot | undefined => {
  const file = state.files[sourcePath];
  const localeState = file?.locales[locale];
  if (!file || !localeState) return undefined;

  const keys: Record<string, TranslationStateKey> = {};
  for (let i = 0; i < file.keys.length; i++) {
    const key = file.keys[i];
    const sourceHash = file.sourceHashes[i];
    const targetHash = localeState.targetHashes[i];
    if (!key || !sourceHash || !targetHash) continue;
    keys[key] = {
      sourceHash,
      targetHash,
      fingerprint: localeState.fingerprint,
    };
  }

  return {
    targetPath: localeState.targetPath,
    keys,
  };
};

export const replaceTranslationLocaleState = (
  state: TranslationState,
  sourcePath: string,
  kind: TranslationFileKind,
  locale: string,
  targetPath: string,
  keys: Record<string, TranslationStateKey>,
) => {
  const sortedKeys = sortRecord(keys);
  const existingFile = state.files[sourcePath];
  const file: TranslationStateFile = existingFile ?? {
    kind,
    keys: [],
    sourceHashes: [],
    locales: {},
  };
  file.kind = kind;
  const oldKeys = file.keys;
  const nextKeys = Object.keys(sortedKeys).sort((a, b) => a.localeCompare(b));
  const remappedLocales = Object.fromEntries(
    Object.entries(file.locales).map(([existingLocale, localeState]) => {
      const oldTargetHashes = new Map<string, string | null>();
      oldKeys.forEach((key, index) => {
        oldTargetHashes.set(key, localeState.targetHashes[index] ?? null);
      });

      return [
        existingLocale,
        {
          ...localeState,
          targetHashes: nextKeys.map((key) => oldTargetHashes.get(key) ?? null),
        },
      ];
    }),
  );

  file.keys = nextKeys;
  file.sourceHashes = nextKeys.map((key) => sortedKeys[key]?.sourceHash ?? "");
  file.locales = remappedLocales;

  const hasTargetHashes = Object.values(sortedKeys).some(
    (entry) => !!entry.targetHash,
  );
  if (hasTargetHashes) {
    const firstEntry = Object.values(sortedKeys)[0];
    file.locales[locale] = {
      targetPath,
      fingerprint: firstEntry.fingerprint,
      targetHashes: nextKeys.map((key) => sortedKeys[key]?.targetHash ?? null),
    };
  } else {
    delete file.locales[locale];
  }

  if (Object.keys(file.locales).length) {
    state.files[sourcePath] = {
      ...file,
      locales: sortRecord(file.locales),
    };
  } else {
    delete state.files[sourcePath];
  }

  state.files = sortRecord(state.files);
};

export const hashText = (value: string): string =>
  createHash("sha256").update(JSON.stringify(value), "utf-8").digest("hex");

export const hashStableValue = (value: unknown): string =>
  createHash("sha256").update(stableStringify(value), "utf-8").digest("hex");

export const buildTranslationFingerprint = (
  inputs: Inputs,
  providerName: string,
  targetLocale: string,
): string => {
  const awsTerminologyNames = inputs.awsTerminologyNames?.length
    ? inputs.awsTerminologyNames
    : undefined;
  const awsParallelDataNames = inputs.awsParallelDataNames?.length
    ? inputs.awsParallelDataNames
    : undefined;

  return hashStableValue({
    schemaVersion: TRANSLATION_STATE_SCHEMA_VERSION,
    provider: providerName,
    sourceLocale: inputs.sourceLocale,
    targetLocale,
    categoryId: inputs.categoryId ?? null,
    apiVersion: inputs.apiVersion ?? null,
    textType: inputs.textType ?? null,
    profanityAction: inputs.profanityAction ?? null,
    profanityMarker:
      inputs.profanityAction === "Marked"
        ? (inputs.profanityMarker ?? null)
        : null,
    allowFallback: inputs.allowFallback ?? null,
    ...(providerName === "aws" && inputs.awsFormality
      ? { awsFormality: inputs.awsFormality }
      : {}),
    ...(providerName === "aws" && inputs.awsBrevity
      ? { awsBrevity: true }
      : {}),
    ...(providerName === "aws" && awsTerminologyNames
      ? { awsTerminologyNames }
      : {}),
    ...(providerName === "aws" && awsParallelDataNames
      ? { awsParallelDataNames }
      : {}),
    ...(providerName === "google" && inputs.googleModel
      ? { googleModel: inputs.googleModel }
      : {}),
    ...(providerName === "google" && inputs.googleApiEndpoint
      ? { googleApiEndpoint: inputs.googleApiEndpoint }
      : {}),
    ...(providerName === "google" && inputs.googleAutoRetry !== undefined
      ? { googleAutoRetry: inputs.googleAutoRetry }
      : {}),
    protectPlaceholders: inputs.protectPlaceholders !== false,
    customPlaceholderPatterns: inputs.customPlaceholderPatterns ?? [],
    glossary: inputs.glossary ?? {},
  });
};

export const stableStringify = (value: unknown, space?: number): string =>
  JSON.stringify(sortStable(value), null, space);

const sortRecord = <T>(record: Record<string, T>): Record<string, T> =>
  Object.fromEntries(
    Object.entries(record).sort(([a], [b]) => a.localeCompare(b)),
  ) as Record<string, T>;

const getWorkspaceRoot = (): string =>
  process.env["GITHUB_WORKSPACE"] ?? process.cwd();

const sortStable = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortStable);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortStable(value[key])]),
    );
  }

  return value;
};

const isTranslationState = (value: unknown): value is TranslationState => {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === TRANSLATION_STATE_SCHEMA_VERSION &&
    isRecord(value.files)
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
