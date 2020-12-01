import { XliffFile } from "../files/xliff-file";
import { TranslationFileParser } from "../translation-file-parser";
import { TranslatableTextMap } from "../translatable-text-map";
import { naturalLanguageCompare } from "../utils";
import { XmlFileParser } from "./xml-file-parser";

export class XliffParser implements TranslationFileParser {
    async parseFrom(fileContent: string): Promise<XliffFile> {
        return await XmlFileParser.fromXml<XliffFile>(fileContent);
    }

    toFileFormatted(instance: XliffFile, defaultValue: string): string {
        try {
            return XmlFileParser.toXml(instance);
        } catch (error) {
            return defaultValue;
        }
    }

    applyTranslations(
        instance: XliffFile,
        translations: { [key: string]: string; } | undefined,
        ordinals: number[] | undefined): XliffFile {
        if (instance && translations && ordinals && ordinals.length) {
            let index = 0;
            for (let key in translations) {
                const ordinal = ordinals[index++];
                const value = translations[key];
                if (value) {
                    instance.xliff.file.unit[ordinal].segment[0].target = value;
                }
            }
        }

        return instance;
    }

    toTranslatableTextMap(instance: XliffFile): TranslatableTextMap {
        const textToTranslate: Map<string, string> = new Map();
        const values = instance.xliff.file.unit;
        if (values && values.length) {
            for (let i = 0; i < values.length; ++i) {
                const key = values[i].segment[0].source;
                const value = values[i].segment[0].target;

                textToTranslate.set(key, value);
            }
        }

        const translatableText: Map<string, string> = new Map();
        [...textToTranslate.keys()].sort((a, b) => naturalLanguageCompare(a, b)).forEach(key => {
            translatableText.set(key, textToTranslate.get(key)!);
        });

        const ordinals: number[] =
            [...translatableText.keys()].map(
                key => values.findIndex(d => d.segment[0].source === key));

        return {
            text: translatableText,
            ordinals
        };
    }
}