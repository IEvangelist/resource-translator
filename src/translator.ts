import { ResourceFile } from "./resource-file";

export async function getTranslatableText(resourceXml: ResourceFile): Promise<Map<string, string>> {
    const textToTranslate: Map<string, string> = new Map();
    const values = resourceXml.root.data;
    if (values && values.length) {
        for (let i = 0; i < values.length; ++i) {
            const key = values[i].$.name;
            const value = values[i].value![0];

            textToTranslate.set(key, value);
        }
    }
    return textToTranslate;
}