import { debug } from '@actions/core';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { ResourceFile } from './files/resource-file';

export function readFile(path: string) {
    const resolved = resolve(path);
    const file = readFileSync(resolved, 'utf-8');

    debug(`Read file: ${file}`);
    
    return file;
}

export function writeFile(path: string, content: string) {
    debug(`Write file, path: ${path}\nContent: ${content}`)

    writeFileSync(path, content);
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