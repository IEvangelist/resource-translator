import { debug, setFailed } from '@actions/core';
import { AvailableTranslations } from './available-translations';
import { TranslationResult, TranslationResults, TranslationResultSet } from './translation-results';
import { v4 } from 'uuid';
import Axios, { AxiosRequestConfig } from 'axios';
import { TranslatorResource } from './translator-resource';
import { chunk } from './utils';
import { toResultSet } from './api-result-set-mapper';

/**
* https://docs.microsoft.com/azure/cognitive-services/translator/language-support#translate
*/ 
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
        const data = [...translatableText.values()].map(value => {
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

        // Current Azure Translator API rate limit
        // https://docs.microsoft.com/azure/cognitive-services/translator/request-limits#character-and-array-limits-per-request
        const apiRateLimit = 10000;
        const localeCount = toLocales.length;
        const characters = JSON.stringify(data).length;
        const batchCount = Math.ceil(characters * localeCount / apiRateLimit);
        const batchedLocales = batchCount > 1
            ? chunk(toLocales, batchCount)
            : [toLocales];

        let results: TranslationResults = [];
        for (let i = 0; i < batchedLocales.length; i++) {
            const locales = batchedLocales[i];
            const to = locales.map(to => `to=${to}`).join('&');
            debug(`Batch ${i + 1} locales: ${to}`);

            const url = `${baseUrl}translate?api-version=3.0&${to}`;
            const response = await Axios.post<TranslationResult[]>(url, data, options);
            const responseData = response.data;
            debug(`Batch ${i + 1} response: ${JSON.stringify(responseData)}`);

            results = [...results, ...responseData];
        }

        return toResultSet(results, toLocales, translatableText);
    } catch (ex) {
        // Try to write explicit error:
        // https://docs.microsoft.com/en-us/azure/cognitive-services/translator/reference/v3-0-reference#errors
        const e = ex.response
            && ex.response.data
            && ex.response.data as TranslationErrorResponse;
        if (e) {
            setFailed(`error: { code: ${e.error.code}, message: '${e.error.message}' }}`);
        } else {
            
            setFailed(`Failed to translate input: ${ex}`);
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