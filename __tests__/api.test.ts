import { getTranslatableText } from '../src/translator';
import { getAvailableTranslations, translate } from '../src/api';
import { ResourceFile } from '../src/resource-file';

const expectedLocales = [
    'af', 'ar', 'as', 'bg', 'bn', 'bs', 'ca', 'cs',
    'cy', 'da', 'de', 'el', 'en', 'es', 'et', 'fa',
    'fi', 'fil', 'fj', 'fr', 'fr-ca', 'ga', 'gu', 'he',
    'hi', 'hr', 'ht', 'hu', 'id', 'is', 'it', 'ja', 'kk',
    'kmr', 'kn', 'ko', 'ku', 'lt', 'lv', 'mg', 'mi', 'ml',
    'mr', 'ms', 'mt', 'mww', 'nb', 'nl', 'or', 'otq', 'pa',
    'pl', 'prs', 'ps', 'pt', 'pt-pt', 'ro', 'ru', 'sk',
    'sl', 'sm', 'sr-Cyrl', 'sr-Latn', 'sv', 'sw', 'ta',
    'te', 'th', 'tlh-Latn', 'tlh-Piqd', 'to', 'tr', 'ty',
    'uk', 'ur', 'vi', 'yua', 'yue', 'zh-Hans', 'zh-Hant'
]

test("API: get available translations correctly gets all locales", async () => {
    const translations = await getAvailableTranslations();

    expect(translations).toBeTruthy();

    const locales = Object.keys(translations.translation).join(", ");
    expect(locales)
        .toEqual(expectedLocales.join(", "));
});

test("API: translate correctly performs translation", async () => {
    const resourceXml: ResourceFile = {
        root: {
            data: [
                { $: { name: 'Greetings' }, value: ['Hello world!'] }
            ]
        }
    }
    const translatableText = await getTranslatableText(resourceXml);
    const translations = await translate(
        process.env.AZURE_TRANSLATOR_ENDPOINT,
        process.env.AZURE_TRANSLATOR_SUBSCRIPTION_KEY,
        process.env.AZURE_TRANSLATOR_SUBSCRIPTION_REGION,
        expectedLocales,
        translatableText
    );

    expect(translations).toEqual({
        detectedLanguage: {
            language: 'en',
            score: 1.0
        },
        translations: [
            {
                text: 'Hallo Welt!',
                to: 'de'
            }
        ]
    });
});