import { PortableObjectFile, PortableObjectToken } from "../files/po-file";
import { TranslationFileParser } from "../translation-file-parser";
import { TranslatableTextMap } from "../translatable-text-map";
import { delay } from "../utils";

export class PortableObjectParser implements TranslationFileParser {
    async parseFrom(fileContent: string): Promise<PortableObjectFile> {
        await delay(1, {});
        let portableObjectFile: PortableObjectFile = {
            tokens: []
        };
        if (fileContent) {    
            portableObjectFile.tokens =
                fileContent.split('\n').map(
                    line => new PortableObjectToken(line));
        }
        return portableObjectFile;
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
        // const textToTranslate: Map<string, string> = new Map();
        // const values = instance.root.data;
        // if (values && values.length) {
        //     for (let i = 0; i < values.length; ++i) {
        //         const key = values[i].$.name;
        //         const value = values[i].value![0];

        //         textToTranslate.set(key, value);
        //     }
        // }

        // const translatableText: Map<string, string> = new Map();
        // [...textToTranslate.keys()].sort((a, b) => naturalLanguageCompare(a, b)).forEach(key => {
        //     translatableText.set(key, textToTranslate.get(key)!);
        // });

        // const ordinals: number[] =
        //     [...translatableText.keys()].map(
        //         key => values.findIndex(d => d.$.name === key));

        // return {
        //     text: translatableText,
        //     ordinals
        // };
        
        const text: Map<string, string> = new Map();
        const ordinals: number[] = [];

        // TODO: This needs to be implemented.

        return {
            text, ordinals
        };
    }
}