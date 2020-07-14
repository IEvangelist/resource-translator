import { Translations } from "./translations";

export class AvailableTranslations {
    readonly translations: Translations;

    constructor(data: any) {
        Object.assign(this, data);
    }
}