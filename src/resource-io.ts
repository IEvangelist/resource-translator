import { Builder, Parser } from 'xml2js';
import { readFileSync, writeFileSync } from 'fs';
import { ResourceFile } from './resource-file';
import { Result } from './translation-results';

export async function readFile(path: string) {
    const file = readFileSync(path, 'utf-8');
    return await parseXml(file);
}

async function parseXml(file: string): Promise<ResourceFile> {
    const parser = new Parser();
    const xml = await parser.parseStringPromise(file);
    return xml as ResourceFile;
}

export function applyTranslations(resource: ResourceFile, translations: Result[] | undefined) {
    if (resource && translations && translations.length) {
        const keys = translations.map(t => Object.keys(t).find(key => key !== 'to'));
        for (let data of resource.root.data) {
            if (keys.some(key => key === data.$.name)) {
                data.value = [
                    translations.find(translation => !!translation[data.$.name])![data.$.name]
                ];
            }
        }
    }

    return resource;
}

export function buildXml(resource: ResourceFile) {
    const builder = new Builder();
    var xml = builder.buildObject(resource);
    return xml;
}

export function writeFile(path: string, xml: string) {
    writeFileSync(path, xml);
}