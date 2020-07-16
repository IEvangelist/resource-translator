import { Translations } from "./translation-locales";

export class AvailableTranslations {
    readonly translations: Translations;

    constructor(data: any) {
        Object.assign(this, data);
    }
}