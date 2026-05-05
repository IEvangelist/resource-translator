import { PortableObjectToken } from "../../src/file-formats/po-file";
import { PortableObjectParser } from "../../src/parsers/po-parser";

const parser = new PortableObjectParser();

test("PO PARSER: correctly parses from string", async () => {
  const content = `msgid "There is one item."
msgid_plural "There are {0} items."
msgstr[0] "Il y a un élément."
msgstr[1] "Il y a {0} éléments."`;

  const portableObject = await parser.parseFrom(content);
  expect(portableObject.tokens).toBeTruthy();

  const assertToken = (
    token: PortableObjectToken,
    expectedId: string,
    expectedValue: string,
  ) => {
    expect(token).toBeTruthy();
    expect(token.id).toEqual(expectedId);
    expect(token.value).toEqual(expectedValue);
  };

  assertToken(portableObject.tokens[0], "msgid", '"There is one item."');
  assertToken(
    portableObject.tokens[1],
    "msgid_plural",
    '"There are {0} items."',
  );
  assertToken(portableObject.tokens[2], "msgstr[0]", '"Il y a un élément."');
  assertToken(portableObject.tokens[3], "msgstr[1]", '"Il y a {0} éléments."');
});

test("PO PARSER: correctly formats back as string", async () => {
  const content = `msgid "There is one item."
msgid_plural "There are {0} items."
msgstr[0] "Il y a un élément."
msgstr[1] "Il y a {0} éléments."`;

  const portableObject = await parser.parseFrom(content);
  expect(portableObject.tokens).toBeTruthy();

  const fileFormatted = parser.toFileFormatted(portableObject, "");
  expect(fileFormatted).toEqual(content);
});

test("PO PARSER: correctly applies translations", async () => {
  const content = `msgid "There is one item."
msgid_plural "There are {0} items."
msgstr[0] "Il y a un élément."
msgstr[1] "Il y a {0} éléments."`;

  const portableObject = await parser.parseFrom(content);
  expect(portableObject.tokens).toBeTruthy();

  const result = parser.applyTranslations(portableObject, {
    '"There is one item."': '"Does this work?"',
  });
  const assertToken = (
    token: PortableObjectToken,
    expectedId: string,
    expectedValue: string,
  ) => {
    expect(token).toBeTruthy();
    expect(token.id).toEqual(expectedId);
    expect(token.value).toEqual(expectedValue);
  };

  assertToken(result.tokens[0], "msgid", '"There is one item."');
  assertToken(result.tokens[1], "msgid_plural", '"There are {0} items."');
  assertToken(result.tokens[2], "msgstr[0]", '"Does this work?"');
  assertToken(result.tokens[3], "msgstr[1]", '"Il y a {0} éléments."');
});

test("PO PARSER: correctly creates translatable text map", async () => {
  const content = `msgid "There is one item."
msgid_plural "There are {0} items."
msgstr[0] "Il y a un élément."
msgstr[1] "Il y a {0} éléments."`;

  const portableObject = await parser.parseFrom(content);
  expect(portableObject.tokens).toBeTruthy();

  const translatableTextMap = parser.toTranslatableTextMap(portableObject);

  expect(translatableTextMap).toBeTruthy();
  expect(translatableTextMap.text.get('"There is one item."')).toEqual(
    '"There is one item."',
  );
  expect(translatableTextMap.text.get('"There are {0} items."')).toEqual(
    '"There are {0} items."',
  );
});

describe("PortableObjectParser multi-line continuations", () => {
  // Regression: PO files use a continuation syntax for long strings —
  //
  //   msgid ""
  //   "First half "
  //   "second half"
  //
  // Previously the tokenizer split each `"chunk"` line on whitespace and
  // produced garbage tokens like `{id: '"First', value: 'half "'}`. That
  // broke both translation extraction (the fragments looked like keys)
  // AND round-trip emission (the corrupted line was written back).
  //
  // The parser now detects continuation lines, keeps them verbatim, and
  // emits a single warning + skips multi-line entries from the
  // translatable-text map so we don't silently mistranslate them.
  const content = `msgid ""
"Hello "
"world!"
msgstr ""

msgid "Single line"
msgstr ""
`;

  it("preserves continuation lines verbatim through round-trip", async () => {
    const portableObject = await parser.parseFrom(content);
    const formatted = parser.toFileFormatted(portableObject, "");
    expect(formatted).toEqual(content);
  });

  it("flags continuation tokens as such", async () => {
    const portableObject = await parser.parseFrom(content);
    // tokens[0] = msgid "" / tokens[1] = "Hello " / tokens[2] = "world!"
    expect(portableObject.tokens[1].isContinuation).toBe(true);
    expect(portableObject.tokens[2].isContinuation).toBe(true);
    // The single-line msgid is NOT a continuation token.
    const singleLine = portableObject.tokens.find(
      (t) => t.value === '"Single line"',
    );
    expect(singleLine).toBeTruthy();
    expect(singleLine!.isContinuation).toBe(false);
  });

  it("skips multi-line msgid entries from the translatable text map", async () => {
    const portableObject = await parser.parseFrom(content);
    const map = parser.toTranslatableTextMap(portableObject).text;
    // Continuation fragments must NEVER appear as keys.
    expect(map.has('"Hello')).toBe(false);
    expect(map.has('"Hello "')).toBe(false);
    expect(map.has('"world!"')).toBe(false);
    // Non-multiline entries continue to translate normally.
    expect(map.get('"Single line"')).toEqual('"Single line"');
  });

  it("skips entries whose msgstr is multi-line (single-line msgid + continuation msgstr)", async () => {
    // Regression: a single-line msgid + multi-line msgstr looked safe to the
    // text map but `applyTranslations` would rewrite the first msgstr line
    // and leave the dangling continuation lines in place — producing a
    // half-translated mess like:
    //   msgstr "FR:Hello"
    //   "old "
    //   "value"
    // The parser now refuses to translate any entry where EITHER side has
    // continuations.
    const mixed = `msgid "Hello"
msgstr ""
"existing "
"long translation"

msgid "Goodbye"
msgstr "Au revoir"
`;
    const file = await parser.parseFrom(mixed);
    const map = parser.toTranslatableTextMap(file).text;

    // Hello has a multi-line msgstr → skipped.
    expect(map.has('"Hello"')).toBe(false);
    // Goodbye is single-line on both sides → kept.
    expect(map.get('"Goodbye"')).toEqual('"Goodbye"');

    // Apply a translation that includes "Hello" anyway (defense-in-depth).
    parser.applyTranslations(
      file,
      { '"Hello"': '"Bonjour"', '"Goodbye"': '"Au revoir"' },
      "fr",
    );
    const formatted = parser.toFileFormatted(file, "");

    // The Hello entry must remain untouched — both the empty msgstr AND
    // the continuation lines.
    expect(formatted).toContain('msgid "Hello"');
    expect(formatted).toContain('msgstr ""');
    expect(formatted).toContain('"existing "');
    expect(formatted).toContain('"long translation"');
    expect(formatted).not.toContain('"Bonjour"');

    // The Goodbye entry was already translated in the source — the apply
    // re-asserts it. No corruption either way.
    expect(formatted).toContain('msgid "Goodbye"');
    expect(formatted).toContain('"Au revoir"');
  });

  it("skips multi-line plural msgstr[N] entries", async () => {
    const plural = `msgid "Item"
msgid_plural "Items"
msgstr[0] "Item"
msgstr[1] ""
"long "
"plural form"
`;
    const file = await parser.parseFrom(plural);
    const map = parser.toTranslatableTextMap(file).text;

    // Both msgid and msgid_plural should be skipped because the entry
    // contains a multi-line msgstr[1].
    expect(map.has('"Item"')).toBe(false);
    expect(map.has('"Items"')).toBe(false);
  });
});
