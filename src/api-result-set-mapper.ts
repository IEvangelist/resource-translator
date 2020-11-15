import { TranslationResults, TranslationResultSet } from "./translation-results";

export function toResultSet(
    results: TranslationResults,
    toLocales: string[],
    translatableText: Map<string, string>): TranslationResultSet {

    const resultSet: TranslationResultSet = {};
    if (results && results.length) {
        for (let i = 0; i < toLocales.length; ++ i) {
            const locale = toLocales[i];
            let result = {};
            let index = 0;
            for (let [key, _] of translatableText) {
                const translations = results[index++].translations;
                const match = translations.find(r => r.to === locale);
                if (match && match['text']) {
                    result[key] = match['text'];
                }
            }
            resultSet[locale] = result;
        }
    }

    return resultSet;
}