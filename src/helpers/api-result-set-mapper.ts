import {
  TranslationResults,
  TranslationResultSet,
} from "../abstractions/translation-results";
import { zip } from "./utils";

export const toResultSet = (
  results: TranslationResults,
  toLocales: string[],
  translatableText: Map<string, string>,
): TranslationResultSet => {
  const translatableKeys = [...translatableText.keys()];
  const resultSet: TranslationResultSet = {};
  if (results && results.length) {
    toLocales.forEach((locale) => {
      const result = {};
      const matches = results.filter((r) =>
        r.translations.some((t) => t.to === locale),
      );
      if (matches) {
        const translations = toRawTextArray(matches, locale);
        const zipped = zip(translatableKeys, translations);
        for (let i = 0; i < zipped.length; ++i) {
          const key: string = zipped[i][0];
          const value = zipped[i][1];
          // Azure occasionally returns an empty translation for a given key
          // (especially for low-resource locales), which `toRawTextArray`
          // filters out. Skip those keys entirely so downstream consumers
          // receive a `Record<string, string>` whose values really are
          // strings; the file writers will fall back to the source text.
          if (typeof value !== "string") continue;
          result[key] = value;
        }
        resultSet[locale] = result;
      }
    });
  }

  return resultSet;
};

const toRawTextArray = (
  translationResults: TranslationResults,
  locale: string,
): string[] => {
  const rawTextArray: string[] = [];
  if (translationResults && translationResults.length) {
    for (let i = 0; i < translationResults.length; ++i) {
      const translations = translationResults[i].translations;
      translations.forEach((translation) => {
        if (translation.to === locale && translation.text) {
          rawTextArray.push(translation.text);
        }
      });
    }
  }

  return rawTextArray;
};
