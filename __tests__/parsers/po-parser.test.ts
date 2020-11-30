import { context } from '@actions/github/lib/utils';
import { PortableObjectToken } from '../../src/files/po-file';
import { PortableObjectParser } from '../../src/parsers/po-parser';

const parser = new PortableObjectParser();

test('PO PARSER: correctly ', async () => {
    const content = `msgid "There is one item."
msgid_plural "There are {0} items."
msgstr[0] "Il y a un élément."
msgstr[1] "Il y a {0} éléments."`;

    const portableObject = await parser.parseFrom(content);
    expect(portableObject.tokens).toBeTruthy();

    const assertToken = (token: PortableObjectToken, expectedId: string, expectedValue: string) => {
        expect(token).toBeTruthy();
        expect(token.id).toEqual(expectedId);
        expect(token.value).toEqual(expectedValue);
    };

    assertToken(portableObject.tokens[0], 'msgid', '"There is one item."');
    assertToken(portableObject.tokens[1], 'msgid_plural', '"There are {0} items."');
    assertToken(portableObject.tokens[2], 'msgstr[0]', '"Il y a un élément."');
    assertToken(portableObject.tokens[3], 'msgstr[1]', '"Il y a {0} éléments."');
});