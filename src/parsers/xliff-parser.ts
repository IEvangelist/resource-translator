import { ResourceParser } from "../resource-parser";
import { delay } from "../utils";

export class XliffParser implements ResourceParser {
    async parseFrom<T>(fileContent: string): Promise<T> {
        const xliff = await delay(1, { empty: true });
        return xliff as T; // This is a fake, and will not work.
    }

    toFileFormatted<T, TDefault extends string>(instance: T, defaultValue: TDefault): TDefault {
        throw new Error('Method not implemented.');
    }
}