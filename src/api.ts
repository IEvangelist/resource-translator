import { AvailableTranslations } from './available-translations';

export async function getAvailableTranslations(): Promise<AvailableTranslations> {
    const url = 'https://api.cognitive.microsofttranslator.com/languages?api-version=3.0&scope=translation';
    const response = await fetch(url);
    const json = await response.json();
    
    return new AvailableTranslations(JSON.parse(json));
}