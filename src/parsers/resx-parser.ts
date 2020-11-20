import { Builder, Parser } from 'xml2js';
import { ResourceParser } from '../resource-parser';

export class ResxParser implements ResourceParser {
    async parseFrom<T>(fileContent: string): Promise<T> {
        const parser = new Parser();
        const xml = await parser.parseStringPromise(fileContent);
        return xml as T;
    }

    toFileFormatted<T, TDefault extends string>(instance: T, defaultValue: TDefault): TDefault {
        try {
            const builder = new Builder();
            var xml = builder.buildObject(instance);
            return xml as TDefault;
        } catch (error) {
            return defaultValue;
        }
    }
}