import { Builder, Parser } from "xml2js";
import { XliffFile } from "../files/xliff-file";
import { TranslationFileParser } from "../translation-file-parser";
import { TranslatableTextMap } from "../translator";
import { naturalLanguageCompare } from "../utils";

export class XliffParser implements TranslationFileParser {
    async parseFrom(fileContent: string): Promise<XliffFile> {
        const parser = new Parser();
        const xliffXml = await parser.parseStringPromise(fileContent);
        return xliffXml as XliffFile;
    }

    toFileFormatted(instance: XliffFile, defaultValue: string): string {
        try {
            const builder = new Builder();
            var xliffXml = builder.buildObject(instance);
            return xliffXml;
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