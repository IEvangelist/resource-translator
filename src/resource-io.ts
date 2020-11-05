import { Builder, Parser } from 'xml2js';
import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { ResourceFile } from './resource-file';

export async function readFile(path: string) {
    const url = pathToFileURL(path);
    const file = readFileSync(url, 'utf-8');
    return await parseXml(file);
}

async function parseXml(file: string): Promise<ResourceFile> {
    const parser = new Parser();
    const xml = await parser.parseStringPromise(file);
    return xml as ResourceFile;
}

export function applyTranslations(
    resource: ResourceFile,
    translations: { [key: string]: string } | undefined,
    ordinals: number[] | undefined) {
    if (resource && translations && ordinals && ordinals.length) {
        let index = 0;
        for (let key in translations) {
            const ordinal = ordinals[index++];
            const translation = translations[key];
            resource.root.data[ordinal].value = [translation];
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