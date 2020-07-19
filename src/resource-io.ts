import { readFileSync, writeFileSync } from 'fs';
import { Builder, Parser } from 'xml2js';
import { ResourceFile } from './resource-file';

export async function readFile(path: string) {
    const file = readFileSync(path, 'utf-8');
    return await parseXml(file);
}

async function parseXml(file: string): Promise<ResourceFile> {
    const parser = new Parser();
    const xml = await parser.parseStringPromise(file);
    return xml as ResourceFile;
}

export function buildXml(data: string) {
    const builder = new Builder();
    var xml = builder.buildObject(data);
    return xml;
}

export function writeFile(path: string, xml: string) {
    writeFileSync(path, xml);
}