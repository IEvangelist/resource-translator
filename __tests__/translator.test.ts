import { getTranslatableTextMap } from '../src/translator';
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

        const map = (await getTranslatableTextMap(resourceXml)).text;
        if (map !== null) {
            expect(map.get("Greetings")).toEqual("Hello world, this is a test.... only a test!");
            expect(map.get("MyFriend")).toEqual("Where have you gone?");
        }
    }
});

test('IO: get translatable text map', async () => {
    const resourcePath = resolve(__dirname, './data/Index.en.resx');
    let resourceXml = await readFile(resourcePath);

    const translatableTextMap = await getTranslatableTextMap(resourceXml);

    expect(translatableTextMap).toBeTruthy();
    expect(translatableTextMap.ordinals).toEqual([0,1,2]);
    expect(translatableTextMap.text).toBeTruthy();

    expect(translatableTextMap.text.get('Greeting')).toEqual('Welcome to your new app.');
    expect(translatableTextMap.text.get('HelloWorld')).toEqual('Hello, world!');
    expect(translatableTextMap.text.get('SurveyTitle')).toEqual('How is Blazor working for you?.');
});