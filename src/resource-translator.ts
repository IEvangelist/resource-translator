// sourceLocale:    en
// subscriptionKey: c57xxxxxxxxxxxxxxxxxxxxxxxxxxac3
// region:          canadacentral
// endpoint:        https://api.cognitive.microsofttranslator.com/

//  This looks interesting: https://github.com/ryanluton/translate-resx/blob/master/translate-resx.js

/**
 * WORKFLOW
 * 
 * Determine if 'baseFileGlob' files match files that were changed in the current contextual PR
 *    If not, nop... cleanly exit
 * 
 * Get input/validate 'subscriptionKey' and 'endpoint' or exit
 * Get resource files based on 'baseFileGlob' from source
 * For each resource file:
 *    Parse XML, translate each key/value pair, write out resulting translations
 * Create PR based on newly created translation files * 
 */

import { info, setFailed, setOutput, debug } from '@actions/core';
import { getAvailableTranslations, translate } from './api';
import { findAllTranslationFiles } from './translation-file-finder';
import { existsSync } from 'fs';
import { readFile, writeFile } from './resource-io';
import { summarize } from './summarizer';
import { Summary } from './summary';
import { getLocaleName, naturalLanguageCompare, stringifyMap } from './utils';
import { Inputs } from './inputs';
import { translationFileParserFactory } from './factories/translation-file-parser-factory';
import { TranslationFile } from './files/translation-file';
import { TranslationFileKind } from './translation-file-kind';

export async function start(inputs: Inputs) {
    try {
        if (!inputs) {
            setFailed('Both a subscriptionKey and endpoint are required.');
        } else {
            const availableTranslations = await getAvailableTranslations();
            if (!availableTranslations || !availableTranslations.translation) {
                setFailed("Unable to get target translations.");
                return;
            }
            const sourceLocale = inputs.sourceLocale;
            const toLocales =
                Object.keys(availableTranslations.translation)
                    .filter(locale => {
                        if (locale === sourceLocale) {
                            return false;
                        }
                        
                        if (inputs.toLocales && inputs.toLocales.length) {
                            return inputs.toLocales.some(l => l === locale);
                        }

                        return true;
                    })
                    .sort((a, b) => naturalLanguageCompare(a, b));
            info(`Detected translation targets to: ${toLocales.join(", ")}`);

            const translationFiles = await findAllTranslationFiles(inputs.sourceLocale);
            if (!translationFiles ||
                (!translationFiles.po &&
                    !translationFiles.restext &&
                    !translationFiles.resx &&
                    !translationFiles.xliff)) {
                setFailed("Unable to get target resource files.");
                return;
            }

            let summary = new Summary(sourceLocale, toLocales);

            for (let key of Object.keys(translationFiles)) {
                const kind = key as TranslationFileKind;
                const resourceFiles = translationFiles[kind];
                if (!resourceFiles || !resourceFiles.length) {
                    continue;
                }

                const translationFileParser = translationFileParserFactory(kind);
                for (let index = 0; index < resourceFiles.length; ++index) {
                    const resourceFilePath = resourceFiles[index];
                    const resourceFileContent = readFile(resourceFilePath);

                    const parsedFile = await translationFileParser.parseFrom(resourceFileContent);
                    const translatableTextMap = translationFileParser.toTranslatableTextMap(parsedFile);

                    debug(`Translatable text:\n ${JSON.stringify(translatableTextMap, stringifyMap)}`);

                    if (translatableTextMap) {
                        const resultSet = await translate(
                            inputs,
                            toLocales,
                            translatableTextMap.text);

                        debug(`Translation result:\n ${JSON.stringify(resultSet)}`);

                        if (resultSet) {
                            toLocales.forEach(locale => {
                                const translations = resultSet[locale];
                                if (!translations) {
                                    return;
                                }
                                const clone = Object.assign({} as TranslationFile, resourceFileContent);
                                const result =
                                    translationFileParser.applyTranslations(
                                        clone, translations, translatableTextMap.ordinals);

                                const translatedFile = translationFileParser.toFileFormatted(result, "");
                                const newPath = getLocaleName(resourceFilePath, locale);
                                if (translatedFile && newPath) {
                                    if (existsSync(newPath)) {
                                        summary.updatedFileCount++;
                                        summary.updatedFileTranslations += translatableTextMap.ordinals.length;
                                    } else {
                                        summary.newFileCount++;
                                        summary.newFileTranslations += translatableTextMap.ordinals.length;
                                    }
                                    writeFile(newPath, translatedFile);
                                }
                            });
                        } else {
                            setFailed("Unable to translate input text.");
                        }
                    } else {
                        setFailed("No translatable text to work with");
                    }
                }
            }

            setOutput('has-new-translations', summary.hasNewTranslations);

            const [title, details] = summarize(summary);
            setOutput('summary-title', title);
            setOutput('summary-details', details);
        }
    } catch (error) {
        setFailed(error.message);
    }
}