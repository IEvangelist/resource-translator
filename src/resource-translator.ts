import {
  debug,
  info,
  setFailed,
  setOutput,
  summary as coreSummary,
  warning,
} from "@actions/core";
import { existsSync } from "fs";
import { Summary } from "./abstractions/summary";
import { TranslationFileKind } from "./abstractions/translation-file-kind";
import { Inputs } from "./action/inputs";
import { TranslatorResource } from "./abstractions/translator-resource";
import { getAvailableTranslations, translate } from "./api/translation-api";
import { translationFileParserFactory } from "./factories/translation-file-parser-factory";
import { applyGlossary } from "./helpers/glossary";
import { summarize } from "./helpers/summarizer";
import {
  getLocaleName,
  naturalLanguageCompare,
  stringifyMap,
} from "./helpers/utils";
import { readFile, writeFile } from "./io/reader-writer";
import { findAllTranslationFiles } from "./io/translation-file-finder";

export async function start(inputs: Inputs) {
  const failOnError = inputs.failOnError ?? true;
  const dryRun = inputs.dryRun ?? false;

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
    const availableTranslations = await getAvailableTranslations(
      inputs.apiVersion,
    );
    if (!availableTranslations || !availableTranslations.translation) {
      reportError("Unable to get target translations.");
      return;
    }
    const sourceLocale = inputs.sourceLocale;
    const toLocales = Object.keys(availableTranslations.translation)
      .filter((locale) => {
        if (locale === sourceLocale) {
          return false;
        }

        if (inputs.toLocales && inputs.toLocales.length) {
          return inputs.toLocales.some((l) => l === locale);
        }

        return true;
      })
      .sort((a, b) => naturalLanguageCompare(a, b));
    info(`Detected translation targets to: ${toLocales.join(", ")}`);

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

    const summary = new Summary(sourceLocale, toLocales);
    const translatorResource: TranslatorResource = {
      endpoint: inputs.endpoint,
      subscriptionKey: inputs.subscriptionKey,
      region: inputs.region,
      apiVersion: inputs.apiVersion,
      categoryId: inputs.categoryId,
      sourceLocale: inputs.sourceLocale,
      textType: inputs.textType,
      profanityAction: inputs.profanityAction,
      profanityMarker: inputs.profanityMarker,
      allowFallback: inputs.allowFallback,
    };

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

          const resultSet = await translate(
            translatorResource,
            toLocales,
            translatableTextMap.text,
            filePath,
          );

          debug(`Translation result:\n ${JSON.stringify(resultSet)}`);

          if (resultSet === undefined) {
            reportError("Unable to translate input text.");
            continue;
          }

          const length = translatableTextMap.text.size;
          debug(
            `Translation count: ${length}, toLocales size: ${toLocales.length}`,
          );

          for (let i = 0; i < toLocales.length; ++i) {
            const locale = toLocales[i];
            const translations = applyGlossary(
              resultSet[locale],
              inputs.glossary,
            );
            if (!translations) {
              debug(`Unable to find resulting translations for: ${locale}`);
              continue;
            }
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
              locale,
            );

            const translatedFile = translationFileParser.toFileFormatted(
              result,
              "",
            );
            const newPath = getLocaleName(filePath, locale);
            if (translatedFile && newPath) {
              debug(`The newPath: ${newPath}`);

              if (existsSync(newPath)) {
                summary.updatedFileCount++;
                summary.updatedFileTranslations += length;
              } else {
                summary.newFileCount++;
                summary.newFileTranslations += length;
              }
              if (dryRun) {
                info(`[dry-run] Would write ${newPath}`);
              } else {
                writeFile(newPath, translatedFile);
              }
            } else {
              debug(`The translatedFile value is ${translatedFile}`);
              debug(`The newPath would have been ${newPath}`);
            }
          }
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          reportError(`Failed processing ${filePath}: ${message}`);
        }
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
