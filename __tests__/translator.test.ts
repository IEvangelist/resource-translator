import { getTranslatableText } from '../src/translator';
import { readFile } from '../src/resource-io';
import { resolve } from 'path';
import { ResourceFile } from '../src/resource-file';

let resourceXml: ResourceFile;

beforeEach(async () => {
    const resourcePath = resolve(__dirname, "./data/Test.en.resx");
    resourceXml = await readFile(resourcePath);
});

test("IO: translatable XML is mapped parses known XML", async () => {
    if (resourceXml !== null) {
        expect(resourceXml).toBeTruthy();

        const map = await getTranslatableText(resourceXml);
        if (map !== null) {
            expect(map.get("Greetings")).toEqual("Hello world, this is a test.... only a test!");
            expect(map.get("MyFriend")).toEqual("Where have you gone?");
        }
    }
});