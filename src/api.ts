import { error } from '@actions/core';
import { AvailableTranslations } from './available-translations';
import { TranslationResult } from './translation-results';
import { uuid } from 'uuidv4';
import Axios, { AxiosRequestConfig } from 'axios';

export async function getAvailableTranslations(): Promise<AvailableTranslations> {
    const url = 'https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation';
    const response = await Axios.get<AvailableTranslations>(url);
    return response.data;
}

export async function translate(
    endpoint: string,
    subscriptionKey: string,
    region: string,
    toLocales: string[],
    translatableText: Map<string, string>): Promise<TranslationResult | undefined> {
    try {
        const data = [
            { 
                'text': 'Hello World!',
                'index': 'Another word for asshole?'
            }
        ];
        const options: AxiosRequestConfig = {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': subscriptionKey,
                'Ocp-Apim-Subscription-Region': region,
                'Content-type': 'application/json',
                'X-ClientTraceId': uuid()
            },
            data,
            responseType: 'json',
        };

        const url = `${endpoint}/translate?api-version=3.0&${toLocales.map(to => `to=${to}`).join('&')}`;
        const response = await Axios.post<TranslationResult>(url, data, options);
        return response.data;
    } catch (ex) {
        error(`Failed to translate input: ${ex}`);
        return undefined;
    }
}