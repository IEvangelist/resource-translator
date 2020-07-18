import Axios from 'axios';
import { AvailableTranslations } from './available-translations';
import { TranslationResult } from './translation-results';

export async function getAvailableTranslations(): Promise<AvailableTranslations> {
    const url = 'https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation';
    const response = await Axios.get<AvailableTranslations>(url);
    return response.data;
}

export async function translate(
    endpoint: string,
    translatableText: string[]): Promise<TranslationResult> {    
    const response = await Axios.post<TranslationResult>(endpoint, translatableText);
    return response.data;
}