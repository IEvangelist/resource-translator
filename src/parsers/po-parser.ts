import { PortableObjectFile } from "../files/po-file";
import { TranslationFileParser } from "../translation-file-parser";
import { TranslatableTextMap } from "../translator";
import { delay } from "../utils";

export class PortableObjectParser implements TranslationFileParser {
    async parseFrom(fileContent: string): Promise<PortableObjectFile> {
        const portableObject = await delay(1, { empty: true });
        return portableObject as PortableObjectFile; // This is a fake, and will not work.
    }

    toFileFormatted(instance: PortableObjectFile, defaultValue: string): string {
        throw new Error('Method not implemented.');
    }

    applyTranslations(
        instance: PortableObjectFile,
        translations: { [key: string]: string; } | undefined,
        ordinals: number[] | undefined): PortableObjectFile {
        throw new Error("Method not implemented.");
    }

    toTranslatableTextMap(instance: PortableObjectFile): TranslatableTextMap {
        const text: Map<string, string> = new Map();
        const ordinals: number[] = [];

        // TODO: This needs to be implemented.

        return {
            text, ordinals
        };
    }
}