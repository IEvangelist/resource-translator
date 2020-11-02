import { AvailableTranslations } from './available-translations';
import { TranslationResult } from './translation-results';
import { uuid } from 'uuidv4';
import Axios from 'axios';

export async function getAvailableTranslations(): Promise<AvailableTranslations> {
    const url = 'https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation';
    const response = await Axios.get<AvailableTranslations>(url);
    return response.data;
}

export async function translate(
    endpoint: string,
    subscriptionKey: string,
    toLocales: string[],
    translatableText: Map<string, string>): Promise<TranslationResult> {
    const options = {
        baseUrl: endpoint,
        url: 'translate',
        qs: {
            'api-version': '3.0',
            'to': toLocales
        },
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuid().toString()
        },
        body: [
            JSON.stringify(
                Object.fromEntries(
                    translatableText.entries()))
        ],
        json: true,
    };  

    const response = await Axios.post<TranslationResult>(endpoint, translatableText, options);
    return response.data;
}