import { RestextFile } from "../files/restext-file";
import { TranslationFileParser } from "../translation-file-parser";
import { TranslatableTextMap } from "../translator";
import { delay } from "../utils";

export class RestextParser implements TranslationFileParser {
    async parseFrom(fileContent: string): Promise<RestextFile> {
        await delay(1, {});
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
        throw new Error("Method not implemented.");
    }
}