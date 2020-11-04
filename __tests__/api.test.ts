import * as process from 'process';
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

test('API: get available translations correctly gets all locales', async () => {
    const translations = await getAvailableTranslations();

    expect(translations).toBeTruthy();

    const locales = Object.keys(translations.translation).join(', ');
    expect(locales)
        .toEqual(expectedLocales.join(', '));
});

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
    const translatableText = await getTranslatableText(resourceXml);
    const translatorResource = {
        endpoint: process.env['AZURE_TRANSLATOR_ENDPOINT'] || 'https://api.cognitive.microsofttranslator.com/',
        subscriptionKey: process.env['AZURE_TRANSLATOR_SUBSCRIPTION_KEY'] || 'unknown!',
        region: process.env['AZURE_TRANSLATOR_SUBSCRIPTION_REGION'] || undefined
    };
    const resultSet = await translate(
        translatorResource,
        ['fr', 'es'],
        translatableText);

    expect(resultSet).toEqual(
        {
            'Greeting':
                [
                    { 'text': 'Bienvenue sur votre nouvelle application', to: 'fr' },
                    { 'text': 'Bienvenido a su nueva aplicación', 'to': 'es' }
                ],
            'HelloWorld':
                [
                    { 'text': 'Salut tout le monde!', 'to': 'fr' },
                    { 'text': '¡Hola mundo!', 'to': 'es' }
                ],
            'SurveyTitle':
                [
                    { 'text': 'Comment Blazor travaille-t-il pour vous ? Test...', 'to': 'fr' },
                    { 'text': '¿Cómo funciona Blazor para ti? Pruebas...', 'to': 'es' }
                ]
        });
});