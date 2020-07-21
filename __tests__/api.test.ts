import { getAvailableTranslations } from '../src/api';

test("API: get available translations correctly gets all locales", async () => {
    const translations = await getAvailableTranslations();

    expect(translations).toBeTruthy();

    const locales = Object.keys(translations.translation).join(", ");
    expect(locales)
        .toEqual([
            'af', 'ar', 'bg', 'bn', 'bs', 'ca', 
            'cs', 'cy', 'da', 'de', 'el', 'en', 
            'es', 'et', 'fa', 'fi', 'fil', 'fj', 
            'fr', 'ga', 'gu', 'he', 'hi', 'hr', 
            'ht', 'hu', 'id', 'is', 'it', 'ja', 
            'kk', 'kn', 'ko', 'lt', 'lv', 'mg', 
            'mi', 'ml', 'mr', 'ms', 'mt', 'mww', 
            'nb', 'nl', 'otq', 'pa', 'pl', 'pt', 
            'pt-pt', 'ro', 'ru', 'sk', 'sl', 'sm', 
            'sr-Cyrl', 'sr-Latn', 'sv', 'sw', 
            'ta', 'te', 'th', 'tlh-Latn', 'tlh-Piqd', 
            'to', 'tr', 'ty', 'uk', 'ur', 'vi', 
            'yua', 'yue', 'zh-Hans', 'zh-Hant'
        ].join(", "));
});