import { readFile } from '../src/resource-io';
import { resolve } from 'path';

beforeAll(() => {
    // TODO: do we need anything here?
});

beforeEach(() => {
    // TODO: do we need anything here?
});

afterEach(() => {
    // TODO: do we need anything here?
});

test("read file correctly parses known XML", async () => {
    const resourcePath = resolve(__dirname, "./data/Test.en.resx");
    const resourceXml = await readFile(resourcePath);
    
    console.error(JSON.stringify(resourceXml));

    expect(resourceXml).toBeTruthy();
    expect(resourceXml.root).toBeTruthy();
    expect(resourceXml.root.data).toBeTruthy();
    expect(resourceXml.root.data.length).toBeTruthy();
    expect(resourceXml.root.data[0].$.name).toEqual("Greeting");
    expect(resourceXml.root.data[0].value[0]).toEqual("Hello world, this is a test.... only a test!");
});