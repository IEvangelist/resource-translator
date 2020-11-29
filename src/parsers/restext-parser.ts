import { RestextFile } from "../files/restext-file";
import { TranslationFileParser } from "../translation-file-parser";
import { TranslatableTextMap } from "../translatable-text-map";
import { delay, naturalLanguageCompare } from "../utils";

export class RestextParser implements TranslationFileParser {
    async parseFrom(fileContent: string): Promise<RestextFile> {
        await delay(0, null);
        let restextFile: RestextFile = {};
        if (fileContent) {
            fileContent.split('\n').map(kvp => {
                const keyValuePair = kvp.split('=');
                restextFile = {
                    ...restextFile,
                    [keyValuePair[0]]: keyValuePair[1]
                }
            });
        }
        return restextFile as RestextFile;
    }

    toFileFormatted(instance: RestextFile, defaultValue: string): string {
        const text =
            Object.keys(instance).filter(key => !!key).map(key => {
                return `${key}=${instance[key]}`;
            }).join('\n');
        return text || defaultValue;
    }

    applyTranslations(
        instance: RestextFile,
        translations: { [key: string]: string; } | undefined,
        ordinals: number[] | undefined): RestextFile {
        throw new Error("Method not implemented.");
    }

    toTranslatableTextMap(instance: RestextFile): TranslatableTextMap {
        const textToTranslate: Map<string, string> = new Map();

        let index = 0;
        for (const [key, value] of Object.entries(instance)) {
            textToTranslate.set(key, value);
            index++;
        }
        
        const translatableText: Map<string, string> = new Map();
        [...textToTranslate.keys()].sort((a, b) => naturalLanguageCompare(a, b)).forEach(key => {
            translatableText.set(key, textToTranslate.get(key)!);
        });

        const keys = Object.keys(instance);
        const ordinals: number[] =
            [...translatableText.keys()].map(
                key => keys.findIndex(objKey => objKey === key));

        return {
            text: translatableText,
            ordinals
        };
    }
}