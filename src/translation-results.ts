declare module namespace {

    export interface DetectedLanguage {
        language: string;
        score: number;
    }

    export interface Translation {
        text: string;
        to: string;
    }

    export interface TranslationResult {
        detectedLanguage: DetectedLanguage;
        translations: Translation[];
    }

// [
//     {
//         "detectedLanguage": {
//             "language": "en",
//             "score": 1.0
//         },
//         "translations": [
//             {
//                 "text": "Hallo Welt!",
//                 "to": "de"
//             },
//             {
//                 "text": "Salve, mondo!",
//                 "to": "it"
//             }
//         ]
//     }
// ]