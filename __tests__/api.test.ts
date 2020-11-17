import { readFile, writeFile, buildXml, applyTranslations } from '../src/resource-io';
import { getTranslatableTextMap } from '../src/translator';
import { getAvailableTranslations, translate } from '../src/api';
import { ResourceFile } from '../src/resource-file';
import { resolve } from 'path';
import { getLocaleName, naturalLanguageCompare } from '../src/utils';
import { summarize } from '../src/summarizer';
import { existsSync } from 'fs';
import { Summary } from '../src/summary';

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
];

test('API: get available translations correctly gets all locales', async () => {
    const translations = await getAvailableTranslations();

    expect(translations).toBeTruthy();

    const locales = Object.keys(translations.translation).join(', ');
    expect(locales)
        .toEqual(expectedLocales.join(', '));
});

jest.setTimeout(30000);

test('API: read file->translate->apply->write', async () => {
    const availableTranslations = await getAvailableTranslations();
    const sourceLocale = 'en';
    const toLocales =
        Object.keys(availableTranslations.translation)
            .filter(locale => locale !== sourceLocale)
            .sort((a, b) => naturalLanguageCompare(a, b));

    const resourceFiles = [resolve(__dirname, './data/UIStrings.en.resx')];
    let summary = new Summary(sourceLocale, toLocales);

    for (let index = 0; index < resourceFiles.length; ++ index) {
        const resourceFilePath = resourceFiles[index];
        const resourceFileXml = await readFile(resourceFilePath);
        const translatableTextMap = await getTranslatableTextMap(resourceFileXml);

        if (translatableTextMap) {
            const resultSet = await translate(
                {
                    endpoint: process.env['AZURE_TRANSLATOR_ENDPOINT'] || 'https://api.cognitive.microsofttranslator.com/',
                    subscriptionKey: process.env['AZURE_TRANSLATOR_SUBSCRIPTION_KEY'] || 'unknown!',
                    region: process.env['AZURE_TRANSLATOR_SUBSCRIPTION_REGION'] || undefined
                },
                toLocales,
                translatableTextMap.text);

            if (resultSet) {
                toLocales.forEach(locale => {
                    const translations = resultSet[locale];
                    const clone = { ...resourceFileXml };
                    const result = applyTranslations(clone, translations, translatableTextMap.ordinals);
                    const translatedXml = buildXml(result);
                    const newPath = getLocaleName(resourceFilePath, locale);
                    if (translatedXml && newPath) {
                        if (existsSync(newPath)) {
                            summary.updatedFileCount++;
                            summary.updatedFileTranslations += translatableTextMap.ordinals.length;
                        } else {
                            summary.newFileCount++;
                            summary.newFileTranslations += translatableTextMap.ordinals.length;
                        }
                        writeFile(newPath, translatedXml);
                    }
                });
            }
        }
    }

    const [title, details] = summarize(summary);
    expect(title).toEqual('');
    expect(details).toEqual('');
});

jest.setTimeout(15000);

test('API: translate correctly performs translation', async () => {
    const resourceXml: ResourceFile = {
        root: {
            data: [
                { $: { name: 'Greeting' }, value: ['Welcome to your new app'] },
                { $: { name: 'HelloWorld' }, value: ['Hello, world!'] },
                { $: { name: 'SurveyTitle' }, value: ['How is Blazor working for you? Testing...'] }
            ]
        }
    }
    const translatableTextMap = await getTranslatableTextMap(resourceXml);
    const translatorResource = {
        endpoint: process.env['AZURE_TRANSLATOR_ENDPOINT'] || 'https://api.cognitive.microsofttranslator.com/',
        subscriptionKey: process.env['AZURE_TRANSLATOR_SUBSCRIPTION_KEY'] || 'unknown!',
        region: process.env['AZURE_TRANSLATOR_SUBSCRIPTION_REGION'] || undefined
    };
    const resultSet = await translate(
        translatorResource,
        ['fr', 'es'],
        translatableTextMap.text);

    expect(resultSet).toEqual(
        {
            'es': {
                'Greeting': 'Bienvenido a su nueva aplicación',
                'HelloWorld': '¡Hola mundo!',
                'SurveyTitle': '¿Cómo funciona Blazor para ti? Pruebas...'
            },
            'fr': {
                'Greeting': 'Bienvenue sur votre nouvelle application',
                'HelloWorld': 'Salut tout le monde!',
                'SurveyTitle': 'Comment Blazor travaille-t-il pour vous ? Test...'
            }
        });
});