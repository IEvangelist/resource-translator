import { error, info } from '@actions/core';
import { AvailableTranslations } from './available-translations';
import { TranslationResult, TranslationResults, TranslationResultSet } from './translation-results';
import { v4 } from 'uuid';
import Axios, { AxiosRequestConfig } from 'axios';
import { TranslatorResource } from './translator-resource';
import { findValueByKey } from './utils';

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
            'X-ClientTraceId': v4()
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
            toLocales.forEach(locale => {
                let result = { };
                let index = 0;
                for (let [key, _] of translatableText) {
                    const translations = results[index++].translations;
                    const match = translations.find(r => r.to === locale);
                    if (match && match['text'])
                        result[key] = match['text'];
                }
                resultSet[locale] = result;
            });
        }

        return resultSet;
    } catch (ex) {
        error(`Failed to translate input: ${JSON.stringify(ex)}`);

        // Try to write explicit error:
        // https://docs.microsoft.com/en-us/azure/cognitive-services/translator/reference/v3-0-reference#errors
        const e = ex.response.data as TranslationErrorResponse;
        if (e) {
            error(`error: { code: ${e.error.code}, message: '${e.error.message}' }}`);
        }

        return undefined;
    }
}

interface TranslationErrorResponse {
    error: { 
        code: number,
        message: string;
    }
}