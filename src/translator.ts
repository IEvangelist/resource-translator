import { ResourceFile } from "./resource-file";

export async function getTranslatableText(resourceXml: ResourceFile) {
    const values = resourceXml.root.data;
    if (values && values.length) {
        const textToTranslate: string[] = [];
        for (let i = 0; i < values.length; ++i) {
            const key = values[i].$.name;
            const value = values[i].value![0];

            textToTranslate.push(value);
        }

        return textToTranslate;
    }
}