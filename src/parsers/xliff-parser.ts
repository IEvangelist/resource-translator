import { Builder, Parser } from "xml2js";
import { XliffFile } from "../files/xliff-file";
import { TranslationFileParser } from "../translation-file-parser";
import { TranslatableTextMap } from "../translator";

export class XliffParser implements TranslationFileParser {
    async parseFrom(fileContent: string): Promise<XliffFile> {
        const parser = new Parser();
        const xml = await parser.parseStringPromise(fileContent);
        return xml as XliffFile;
    }

    toFileFormatted(instance: XliffFile, defaultValue: string): string {
        try {
            const builder = new Builder();
            var xml = builder.buildObject(instance);
            return xml;
        } catch (error) {
            return defaultValue;
        }
    }

    applyTranslations(
        instance: XliffFile,
        translations: { [key: string]: string; } | undefined,
        ordinals: number[] | undefined): XliffFile {
        throw new Error("Method not implemented.");
    }

    toTranslatableTextMap(instance: any): TranslatableTextMap {
        throw new Error("Method not implemented.");
    }
}