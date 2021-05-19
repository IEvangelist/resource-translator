import { JsonParser } from '../../src/parsers/json-parser';

const parser = new JsonParser();

const content = `{
\t"messages": {
\t\t"foo": {
\t\t\t"msg1": "hello",
\t\t\t"msg2": "world"
\t\t},
\t\t"bar": "John"
\t},
\t"msg3": "Doe"
}`;

test('JSON PARSER: correctly parses from string', async () => {
    const file = await parser.parseFrom(content);
    expect(file).toBeTruthy();
    expect(file['messages.foo.msg1']).toEqual('hello');
    expect(file['messages.foo.msg2']).toEqual('world');
    expect(file['messages.bar']).toEqual('John');
    expect(file['msg3']).toEqual('Doe');
});

test('JSON PARSER: correctly formats back as string', async () => {
    const file = await parser.parseFrom(content);
    expect(file).toBeTruthy();

    const fileFormatted = parser.toFileFormatted(file, "");
    expect(fileFormatted).toEqual(content);
});

test('JSON PARSER: correctly applies translations', async () => {
    const file = await parser.parseFrom(content);
    expect(file).toBeTruthy();

    const result = parser.applyTranslations(file, {
        'messages.foo.msg2': 'Does this work?'
    });

    expect(result).toBeTruthy();
    expect(file['messages.foo.msg1']).toEqual('hello');
    expect(file['messages.foo.msg2']).toEqual('Does this work?');
    expect(file['messages.bar']).toEqual('John');
    expect(file['msg3']).toEqual('Doe');
});

test('JSON PARSER: correctly creates translatable text map', async () => {
    const file = await parser.parseFrom(content);
    expect(file).toBeTruthy();

    const translatableTextMap = parser.toTranslatableTextMap(file);
    expect(translatableTextMap).toBeTruthy();
    expect(translatableTextMap.text.get('messages.foo.msg1')).toEqual('hello');
    expect(translatableTextMap.text.get('messages.foo.msg2')).toEqual('world');
    expect(translatableTextMap.text.get('messages.bar')).toEqual('John');
    expect(translatableTextMap.text.get('msg3')).toEqual('Doe');
});