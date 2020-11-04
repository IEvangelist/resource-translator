import { error } from '@actions/core';
import { AvailableTranslations } from './available-translations';
import { TranslationResult, TranslationResults, TranslationResultSet } from './translation-results';
import { uuid } from 'uuidv4';
import Axios, { AxiosRequestConfig } from 'axios';
import { TranslatorResource } from './translator-resource';

export async function getAvailableTranslations(): Promise<AvailableTranslations> {
    const url = 'https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation';
    const response = await Axios.get<AvailableTranslations>(url);
    return response.data;
}

export async function translate(
    translatorResource: TranslatorResource,
    toLocales: string[],
    translatableText: Map<string, string>): Promise<TranslationResultSet | undefined> {
    try {
        const data = [ ...translatableText.values() ].map(value => {
            return { text: value };
            });
        const headers = {
            'Ocp-Apim-Subscription-Key': translatorResource.subscriptionKey,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuid()
        };
        if (translatorResource.region) {
            headers['Ocp-Apim-Subscription-Region'] = translatorResource.region;
        }
        const options: AxiosRequestConfig = {
            method: 'POST',
            headers,
            data,
            responseType: 'json'
        };

        const baseUrl = translatorResource.endpoint.endsWith('/')
            ? translatorResource.endpoint
            : `${translatorResource.endpoint}/`;
        const url = `${baseUrl}translate?api-version=3.0&${toLocales.map(to => `to=${to}`).join('&')}`;
        const response = await Axios.post<TranslationResult[]>(url, data, options);
        const results: TranslationResults = response.data;

        const resultSet: TranslationResultSet = { };
        if (results && results.length) {
            let index = 0;
            for (let [key, _] of translatableText) {
                resultSet[key] = results[index++].translations;
            }
        }

        return resultSet;
    } catch (ex) {
        error(`Failed to translate input: ${ex}`);
        return undefined;
    }
}