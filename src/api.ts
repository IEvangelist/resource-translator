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
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuid()
        },
        json: true
    };

    const to = toLocales.map(to => `to=${encodeURIComponent(to)}`).join('&');
    const uri = `${endpoint}/translate?api-version=3.0&${to}`;
    const response =
        await Axios.post<TranslationResult>(uri, [
            JSON.stringify(
                Object.fromEntries(
                    translatableText.entries()))
        ], options);
    return response.data;
}