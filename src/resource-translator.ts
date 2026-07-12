import {
  debug,
  info,
  setFailed,
  setOutput,
  summary as coreSummary,
  warning,
} from "@actions/core";
import { existsSync, readdirSync } from "fs";
import { minimatch } from "minimatch";
import { Summary } from "./abstractions/summary";
import { TranslationFileKind } from "./abstractions/translation-file-kind";
import { Inputs } from "./action/inputs";
import { translationProviderFactory } from "./factories/translation-provider-factory";
import { translationFileParserFactory } from "./factories/translation-file-parser-factory";
import {
  createTranslationStateEntries,
  formatRuleCounts,
  groupPendingTranslationPlans,
  LocaleTranslationPlan,
  planLocaleTranslations,
  TranslationDecisionRule,
} from "./helpers/change-detection";
import { applyGlossary } from "./helpers/glossary";
import { summarize } from "./helpers/summarizer";
import {
  buildTranslationFingerprint,
  getTranslationLocaleState,
  loadTranslationState,
  normalizeStatePath,
  replaceTranslationLocaleState,
  saveTranslationState,
  stableStringify,
} from "./helpers/translation-state";
import {
  getLocaleName,
  naturalLanguageCompare,
  stringifyMap,
} from "./helpers/utils";
import { readFile, writeFile } from "./io/reader-writer";
import { findAllTranslationFiles } from "./io/translation-file-finder";
import { TranslationProvider } from "./providers/translation-provider";

/**
 * Returns a copy of the input text map with any keys matching `patterns`
 * stripped. The patterns are matched against the keys returned by each
 * parser's `toTranslatableTextMap`:
 *   - resx:    `name` attribute
 *   - po:      `msgid`
 *   - xliff:   unit `id`
 *   - json:    `[--]`-joined dotted path
 *   - ini/restext: raw key
 *
 * Stripped keys are still present in the parsed file content, so they fall
 * through unchanged when `applyTranslations` overlays the locale data.
 */
const filterNoTranslateKeys = (
  text: Map<string, string>,
  patterns: string[] | undefined,
): {
  filtered: Map<string, string>;
  skipped: number;
  skippedKeys: string[];
} => {
  if (!patterns || patterns.length === 0) {
    return { filtered: text, skipped: 0, skippedKeys: [] };
  }
  const filtered = new Map<string, string>();
  const skippedKeys: string[] = [];
  let skipped = 0;
  for (const [key, value] of text) {
    const matchesAny = patterns.some((p) =>
      minimatch(key, p, { dot: true, nocase: false }),
    );
    if (matchesAny) {
      skipped++;
      skippedKeys.push(key);
      continue;
    }
    filtered.set(key, value);
  }
  return { filtered, skipped, skippedKeys };
};

interface LocalePlanContext {
  locale: string;
  targetPath: string;
  targetStatePath: string;
  targetExists: boolean;
  targetContent?: string;
  fingerprint: string;
  plan: LocaleTranslationPlan;
}

const getTargetLocales = async (
  provider: TranslationProvider,
  sourceLocale: string,
  configuredLocales: string[] | undefined,
): Promise<string[]> => {
  const availableTranslations = await provider.getAvailableTranslations();
  if (!availableTranslations || !availableTranslations.translation) {
    return [];
  }

  return Object.keys(availableTranslations.translation)
    .filter((locale) => {
      if (locale === sourceLocale) {
        return false;
      }

      if (configuredLocales && configuredLocales.length) {
        return configuredLocales.some((l) => l === locale);
      }

      return true;
    })
    .sort((a, b) => naturalLanguageCompare(a, b));
};

const getSnapshotTargetLocales = (
  sourceLocale: string,
  configuredLocales: string[] | undefined,
  translationFiles: Partial<Record<TranslationFileKind, string[] | undefined>>,
): string[] => {
  if (configuredLocales?.length) {
    return configuredLocales
      .filter((locale) => locale !== sourceLocale)
      .sort((a, b) => naturalLanguageCompare(a, b));
  }

  const locales = new Set<string>();
  for (const [kind, files] of Object.entries(translationFiles)) {
    if (!files?.length) continue;
    for (const sourcePath of files) {
      for (const locale of inferSiblingLocales(
        sourcePath,
        sourceLocale,
        kind as TranslationFileKind,
      )) {
        locales.add(locale);
      }
    }
  }

  return [...locales].sort((a, b) => naturalLanguageCompare(a, b));
};

const inferSiblingLocales = (
  sourcePath: string,
  sourceLocale: string,
  kind: TranslationFileKind,
): string[] => {
  const normalizedSource = sourcePath.replace(/\\/g, "/");
  const directory = normalizedSource.includes("/")
    ? normalizedSource.slice(0, normalizedSource.lastIndexOf("/"))
    : ".";
  const fileName = normalizedSource.slice(
    normalizedSource.lastIndexOf("/") + 1,
  );
  const extension = `.${kind}`;
  const entries = readdirSync(directory === "." ? process.cwd() : directory, {
    withFileTypes: true,
  }).filter((entry) => entry.isFile());

  if (kind === "po") {
    return entries
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(extension))
      .map((name) => name.slice(0, -extension.length))
      .filter((locale) => locale && locale !== sourceLocale);
  }

  const sourceToken = `.${sourceLocale}${extension}`;
  if (!fileName.endsWith(sourceToken)) {
    return [];
  }

  const prefix = fileName.slice(0, -sourceToken.length);
  return entries
    .map((entry) => entry.name)
    .filter(
      (name) =>
        name.startsWith(`${prefix}.`) &&
        name.endsWith(extension) &&
        name !== fileName,
    )
    .map((name) =>
      name.slice(prefix.length + 1, name.length - extension.length),
    )
    .filter(Boolean);
};

const countRule = (
  plan: LocaleTranslationPlan,
  rule: TranslationDecisionRule,
): number => plan.ruleCounts[rule] ?? 0;

const countReturnedTranslations = (
  pendingText: Map<string, string>,
  translations: Record<string, string>,
): number =>
  [...pendingText.keys()].filter((key) => typeof translations[key] === "string")
    .length;

const toTranslationRecord = (
  translations: { [key: string]: string } | undefined,
): Record<string, string> => translations ?? {};

const logPlanDecisions = (
  sourcePath: string,
  skippedKeys: string[],
  context: LocalePlanContext,
) => {
  info(
    `[change-detection] ${sourcePath} -> ${context.locale}: ${formatRuleCounts(
      context.plan.ruleCounts,
      skippedKeys.length,
    )}.`,
  );

  for (const skippedKey of skippedKeys) {
    debug(
      `[change-detection] ${sourcePath} -> ${context.locale} :: ${skippedKey}: SKIP_NO_TRANSLATE`,
    );
  }

  for (const decision of context.plan.decisions) {
    debug(
      `[change-detection] ${sourcePath} -> ${context.locale} :: ${decision.key}: ${decision.rule}`,
    );
  }
};

export async function start(inputs: Inputs) {
  const failOnError = inputs.failOnError ?? true;
  const dryRun = inputs.dryRun ?? false;
  const snapshotOnly = inputs.snapshotOnly ?? false;
  const changeDetectionEnabled =
    (inputs.changeDetection ?? "smart") !== "disabled";

  const reportError = (message: string) => {
    if (failOnError) {
      setFailed(message);
    } else {
      warning(message);
    }
  };

  try {
    if (!inputs) {
      reportError("Both a subscriptionKey and endpoint are required.");
      return;
    }
    const providerName = inputs.provider ?? "azure";
    const provider = snapshotOnly
      ? undefined
      : translationProviderFactory(inputs);
    info(`Using translation provider: ${provider?.name ?? providerName}`);

    const translationStateLoad = changeDetectionEnabled
      ? loadTranslationState(inputs.statePath)
      : undefined;
    const initialStateText = translationStateLoad
      ? stableStringify(translationStateLoad.state)
      : undefined;

    if (translationStateLoad) {
      info(
        `Smart change detection enabled: state=${translationStateLoad.path}, status=${translationStateLoad.status}.`,
      );
      if (snapshotOnly && translationStateLoad.status === "loaded") {
        info(
          `snapshotOnly requested, but a valid smart change-detection state manifest already exists at ${translationStateLoad.path}; no snapshot work is needed.`,
        );
        const summary = new Summary(
          inputs.sourceLocale,
          inputs.toLocales ?? [],
        );
        setOutput("has-new-translations", summary.hasNewTranslations);
        const [title, details] = summarize(summary);
        setOutput("summary-title", title);
        setOutput("summary-details", details);
        try {
          await coreSummary.addRaw(details).write();
        } catch (error: unknown) {
          debug(
            `Failed to write step summary: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
        return;
      }
      if (snapshotOnly) {
        info(
          "snapshotOnly requested: target resource file writes and translation provider calls will be skipped; the smart change-detection state manifest will be bootstrapped from existing target files.",
        );
      }
    } else {
      info(
        "Smart change detection disabled; every eligible key will be sent to the provider.",
      );
    }

    const translationFiles = await findAllTranslationFiles(
      inputs.sourceLocale,
      { include: inputs.include, exclude: inputs.exclude },
    );
    if (
      !translationFiles ||
      (!translationFiles.po &&
        !translationFiles.restext &&
        !translationFiles.resx &&
        !translationFiles.xliff &&
        !translationFiles.ini &&
        !translationFiles.json)
    ) {
      reportError("Unable to get target resource files.");
      return;
    }

    const sourceLocale = inputs.sourceLocale;
    const toLocales = snapshotOnly
      ? getSnapshotTargetLocales(
          sourceLocale,
          inputs.toLocales,
          translationFiles,
        )
      : await getTargetLocales(provider!, sourceLocale, inputs.toLocales);
    if (!toLocales.length) {
      reportError("Unable to get target translations.");
      return;
    }
    info(`Detected translation targets to: ${toLocales.join(", ")}`);

    const summary = new Summary(sourceLocale, toLocales);

    for (const key of Object.keys(translationFiles)) {
      debug(`Iterating translationFiles keys, key: ${key}`);

      const kind = key as TranslationFileKind;
      const files = translationFiles[kind];
      if (!files || !files.length) {
        debug(`For kind ${kind}, there are no translation files.`);
        continue;
      }

      debug(`Translation file parser kind: ${kind}`);

      const translationFileParser = translationFileParserFactory(kind);
      for (let index = 0; index < files.length; ++index) {
        const filePath = files[index];
        try {
          const fileContent = readFile(filePath);
          const parsedFile = await translationFileParser.parseFrom(fileContent);
          const translatableTextMap =
            translationFileParser.toTranslatableTextMap(parsedFile);

          debug(
            `Translatable text:\n ${JSON.stringify(
              translatableTextMap,
              stringifyMap,
            )}`,
          );

          if (!translatableTextMap) {
            reportError("No translatable text to work with");
            continue;
          }

          const { filtered, skipped, skippedKeys } = filterNoTranslateKeys(
            translatableTextMap.text,
            inputs.noTranslatePatterns,
          );
          if (skipped > 0) {
            debug(
              `Skipped ${skipped} key(s) in ${filePath} due to noTranslatePatterns: ${skippedKeys.join(
                ", ",
              )}.`,
            );
          }
          if (filtered.size === 0) {
            debug(
              `All translatable keys in ${filePath} were excluded by noTranslatePatterns; skipping translate call.`,
            );
            continue;
          }

          const sourceStatePath = normalizeStatePath(filePath);
          const localeContexts: LocalePlanContext[] = [];

          for (const locale of toLocales) {
            const targetPath = getLocaleName(filePath, locale);
            if (!targetPath) {
              debug(
                `Unable to determine target path for ${filePath}: ${locale}`,
              );
              continue;
            }

            const targetExists = existsSync(targetPath);
            const targetContent = targetExists
              ? readFile(targetPath)
              : undefined;
            const targetText = targetExists
              ? translationFileParser.toTranslatableTextMap(
                  await translationFileParser.parseFrom(targetContent ?? ""),
                ).text
              : new Map<string, string>();
            const fingerprint = buildTranslationFingerprint(
              inputs,
              provider?.name ?? providerName,
              locale,
            );
            const targetStatePath = normalizeStatePath(targetPath);
            const plan = planLocaleTranslations({
              locale,
              targetPath,
              sourceText: filtered,
              targetText,
              targetExists,
              stateLocale: translationStateLoad
                ? getTranslationLocaleState(
                    translationStateLoad.state,
                    sourceStatePath,
                    locale,
                  )
                : undefined,
              fingerprint,
              bootstrap: translationStateLoad
                ? translationStateLoad.status !== "loaded"
                : false,
              disabled: !changeDetectionEnabled,
              snapshotOnly,
            });

            const context: LocalePlanContext = {
              locale,
              targetPath,
              targetStatePath,
              targetExists,
              targetContent,
              fingerprint,
              plan,
            };
            localeContexts.push(context);
            logPlanDecisions(sourceStatePath, skippedKeys, context);

            summary.reusedTranslations += countRule(plan, "REUSE_UNCHANGED");
            summary.preservedManualEdits += countRule(
              plan,
              "PRESERVE_MANUAL_TARGET_EDIT",
            );
            summary.snapshotBaselineTranslations += countRule(
              plan,
              "SNAPSHOT_BASELINE",
            );
            summary.noTranslateSkipped += skipped;
          }

          const newTranslationsByLocale = new Map<
            string,
            Record<string, string>
          >();
          const failedLocales = new Set<string>();
          const pendingGroups = groupPendingTranslationPlans(
            localeContexts.map((context) => context.plan),
          );

          for (const group of pendingGroups) {
            if (!provider) {
              continue;
            }
            summary.providerRequestCount++;
            summary.providerRequestedTranslations +=
              group.pendingText.size * group.locales.length;
            info(
              `[change-detection] Translating ${group.pendingText.size} changed/missing key(s) in ${sourceStatePath} for locale(s): ${group.locales.join(
                ", ",
              )}.`,
            );

            const resultSet = await provider.translate(
              group.locales,
              group.pendingText,
              filePath,
              {
                protectPlaceholders: inputs.protectPlaceholders,
                customPlaceholderPatterns: inputs.customPlaceholderPatterns,
                maxRetries: inputs.maxRetries,
                retryBackoffMs: inputs.retryBackoffMs,
              },
            );

            debug(`Translation result:\n ${JSON.stringify(resultSet)}`);

            if (resultSet === undefined) {
              reportError("Unable to translate input text.");
              for (const locale of group.locales) {
                failedLocales.add(locale);
              }
              continue;
            }

            for (const locale of group.locales) {
              const translations = applyGlossary(
                resultSet[locale],
                inputs.glossary,
              );
              if (!translations) {
                debug(`Unable to find resulting translations for: ${locale}`);
              }
              newTranslationsByLocale.set(
                locale,
                toTranslationRecord(translations),
              );
            }
          }

          for (const context of localeContexts) {
            if (failedLocales.has(context.locale)) {
              debug(
                `Skipping write for ${context.targetPath} because translation failed for ${context.locale}.`,
              );
              continue;
            }

            const newTranslations =
              newTranslationsByLocale.get(context.locale) ?? {};
            const translatedCount = countReturnedTranslations(
              context.plan.pendingText,
              newTranslations,
            );
            const missingTranslations =
              context.plan.pendingText.size - translatedCount;
            if (missingTranslations > 0) {
              warning(
                `[change-detection] Provider returned no translation for ${missingTranslations} key(s) in ${sourceStatePath} -> ${context.locale}; those keys will be retried on the next run.`,
              );
            }
            const translations = {
              ...context.plan.reusedTranslations,
              ...newTranslations,
            };

            // Re-parse the original file content for each locale instead of
            // shallow-cloning the parsed object. `Object.assign({}, parsed)`
            // only copies top-level keys, so nested fields (`root`, `tokens`,
            // `xliff`, ...) were shared by reference across iterations —
            // applying French translations mutated the source object in
            // place, and the next locale's "clone" inherited French strings
            // instead of the English originals. Re-parsing produces a fully
            // independent tree (and correctly recreates class instances like
            // PortableObjectToken / Map<number,string>, which structuredClone
            // would flatten).
            const clone = await translationFileParser.parseFrom(fileContent);
            const result = translationFileParser.applyTranslations(
              clone,
              translations,
              context.locale,
            );

            const translatedFile = translationFileParser.toFileFormatted(
              result,
              "",
            );
            if (translatedFile && context.targetPath) {
              debug(`The newPath: ${context.targetPath}`);

              const shouldWrite =
                !snapshotOnly &&
                (!context.targetExists ||
                  translatedFile !== context.targetContent);
              if (shouldWrite) {
                if (context.targetExists) {
                  summary.updatedFileCount++;
                  summary.updatedFileTranslations += translatedCount;
                } else {
                  summary.newFileCount++;
                  summary.newFileTranslations += translatedCount;
                }
                if (!context.plan.pendingText.size) {
                  summary.structureOnlyFileCount++;
                }
                if (dryRun) {
                  info(`[dry-run] Would write ${context.targetPath}`);
                } else {
                  writeFile(context.targetPath, translatedFile);
                }
              } else {
                debug(`No file changes detected for ${context.targetPath}.`);
              }

              if (translationStateLoad) {
                const stateEntries = createTranslationStateEntries(
                  context.plan,
                  filtered,
                  translations,
                  context.fingerprint,
                );
                replaceTranslationLocaleState(
                  translationStateLoad.state,
                  sourceStatePath,
                  kind,
                  context.locale,
                  context.targetStatePath,
                  stateEntries,
                );
              }
            } else {
              debug(`The translatedFile value is ${translatedFile}`);
              debug(`The newPath would have been ${context.targetPath}`);
            }
          }
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          reportError(`Failed processing ${filePath}: ${message}`);
        }
      }
    }

    if (translationStateLoad) {
      const nextStateText = stableStringify(translationStateLoad.state);
      const stateChanged = nextStateText !== initialStateText;
      summary.stateUpdated = stateChanged && !dryRun;
      if (stateChanged) {
        if (dryRun) {
          info(
            `[dry-run] Would write smart change-detection state to ${translationStateLoad.path}`,
          );
        } else {
          saveTranslationState(translationStateLoad.state, inputs.statePath);
          info(
            `Updated smart change-detection state at ${translationStateLoad.path}.`,
          );
        }
      } else {
        debug("Smart change-detection state is unchanged.");
      }
    }

    setOutput("has-new-translations", summary.hasNewTranslations);

    const [title, details] = summarize(summary);
    setOutput("summary-title", title);
    setOutput("summary-details", details);

    try {
      await coreSummary.addRaw(details).write();
    } catch (error: unknown) {
      // Step summary writes are best-effort (e.g., when running locally without GITHUB_STEP_SUMMARY).
      debug(
        `Failed to write step summary: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } catch (error: unknown) {
    console.trace();

    const message =
      error instanceof Error ? error.message : `Unknown error: ${error}`;
    reportError(message);
  }
}
