import { XliffFile } from "../files/xliff-file";
import { TranslationFileParser } from "../translation-file-parser";
import { delay } from "../utils";

export class XliffParser implements TranslationFileParser<XliffFile> {
    async parseFrom(fileContent: string): Promise<XliffFile> {
        const xliff = await delay(1, { empty: true });
        return xliff as XliffFile; // This is a fake, and will not work.
    }

    toFileFormatted(instance: XliffFile, defaultValue: string): string {
        throw new Error('Method not implemented.');
    }

    applyTranslations(
        instance: XliffFile,
        translations: { [key: string]: string; } | undefined,
        ordinals: number[] | undefined): XliffFile {
        throw new Error("Method not implemented.");
    }
}