import { RestextFile } from "../files/restext-file";
import { TranslationFileParser } from "../translation-file-parser";
import { TranslatableTextMap } from "../translatable-text-map";
import { delay } from "../utils";

const whiteSpace: RegExp = /\S/;

export class RestextParser implements TranslationFileParser {
    async parseFrom(fileContent: string): Promise<RestextFile> {
        await delay(0, null);
        let restextFile: RestextFile = {};
        if (fileContent) {
            fileContent.split('\n').map((line, index) => {
                if (this.isComment(line) || this.isSection(line) || this.isWhitespace(line)) {
                    restextFile = {
                        ...restextFile,
                        [index]: line
                    }
                } else {
                    const keyValuePair = line.split('=');
                    restextFile = {
                        ...restextFile,
                        [keyValuePair[0]]: keyValuePair[1]
                    }
                }
            });
        }
        return restextFile as RestextFile;
    }

    toFileFormatted(instance: RestextFile, defaultValue: string): string {
        const text =
            Object.keys(instance).filter(key => !!key).map(key => {
                return typeof key === 'number' ? instance[key] : `${key}=${instance[key]}`;
            }).join('\n');
        return text || defaultValue;
    }

    applyTranslations(
        instance: RestextFile,
        translations: { [key: string]: string; } | undefined,
        ordinals?: number[] | undefined): RestextFile {
        if (instance && translations) {
            for (let key in translations) {
                const value = translations[key];
                if (value) {
                    instance[key] = value;
                }
            }
        }

        return instance;
    }

    toTranslatableTextMap(instance: RestextFile): TranslatableTextMap {
        const textToTranslate: Map<string, string> = new Map();
        for (const [key, value] of Object.entries(instance)) {
            if (typeof key !== 'number') {
                textToTranslate.set(key, value);
            }
        }

        return {
            text: textToTranslate
        };
    }

    private isComment = (line: string) => {
        return !!line && line.startsWith(';');
    };

    private isSection = (line: string) => {
        return !!line && line.startsWith('[');
    };

    private isWhitespace = (line: string) => {
        return !whiteSpace.test(line);
    }
}