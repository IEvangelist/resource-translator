import { ResourceFile } from '../files/resource-file';
import { TranslationFileParser } from '../translation-file-parser';
import { naturalLanguageCompare } from '../utils';
import { XmlFileParser } from './xml-file-parser';

export class ResxParser implements TranslationFileParser {
    async parseFrom(fileContent: string): Promise<ResourceFile> {
        return await XmlFileParser.fromXml<ResourceFile>(fileContent);
    }

    toFileFormatted(instance: ResourceFile, defaultValue: string): string {
        try {
            return XmlFileParser.toXml(instance);
        } catch (error) {
            return defaultValue;
        }
    }

    applyTranslations(
        resource: ResourceFile,
        translations: { [key: string]: string } | undefined,
        ordinals: number[] | undefined) {
        //
        // Each translation has a named identifier (it's key), for example: { 'SomeKey': 'some translated value' }.
        // The ordinals map each key to it's appropriate translated value in the resource, for example: [2,0,1].
        // For each translation, we map its keys value to the corresponding ordinal.
        //
        if (resource && translations && ordinals && ordinals.length) {
            let index = 0;
            for (let key in translations) {
                const ordinal = ordinals[index++];
                const value = [translations[key]];
                if (value) {
                    resource.root.data[ordinal].value = value;
                }
            }
        }

        return resource;
    }

    toTranslatableTextMap(instance: ResourceFile) {
        const textToTranslate: Map<string, string> = new Map();
        const values = instance.root.data;
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
}