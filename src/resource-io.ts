import { debug } from '@actions/core';
import { Builder, Parser } from 'xml2js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { ResourceFile } from './resource-file';
import { ResourceParser } from './resource-parser';

export async function readFile(path: string, resourceParser: ResourceParser) {
    const resolved = resolve(path);
    const file = readFileSync(resolved, 'utf-8');

    debug(`Read file: ${file}`);

    return await resourceParser.parseFrom<ResourceFile>(file);
}

export function applyTranslations(
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

export function buildXml(resource: ResourceFile): string | undefined {
    try {
        debug(`JSON: ${JSON.stringify(resource)}`);

        const builder = new Builder();
        var xml = builder.buildObject(resource);
        return xml;
    } catch (error) {
        return undefined;
    }
}

export function writeFile(path: string, xml: string) {
    writeFileSync(path, xml);
}