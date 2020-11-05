import { ResourceFile } from "./resource-file";
import { naturalLanguageCompare } from "./utils";

export interface TranslatableTextMap {
    text: Map<string, string>;
    ordinals: number[];
}

export async function getTranslatableTextMap(resourceXml: ResourceFile): Promise<TranslatableTextMap> {
    const textToTranslate: Map<string, string> = new Map();
    const values = resourceXml.root.data;
    if (values && values.length) {
        for (let i = 0; i < values.length; ++i) {
            const key = values[i].$.name;
            const value = values[i].value![0];

            textToTranslate.set(key, value);
        }
    }

    const translatableText: Map<string, string> = new Map();
    [...textToTranslate.keys()].sort((a, b) => naturalLanguageCompare(a, b)).forEach(key => {
        translatableText.set(key, textToTranslate.get(key)!);
    });

    const ordinals: number[] =
        [...translatableText.keys()].map(
            key => values.findIndex(d => d.$.name === key));

    return {
        text: translatableText,
        ordinals
    };
}