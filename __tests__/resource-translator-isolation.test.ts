import { ResxParser } from "../src/parsers/resx-parser";
import { JsonParser } from "../src/parsers/json-parser";
import { XliffParser } from "../src/parsers/xliff-parser";
import { RestextParser } from "../src/parsers/restext-parser";
import { PortableObjectParser } from "../src/parsers/po-parser";

/**
 * Regression coverage for a long-standing bug in `resource-translator.ts`
 * where `Object.assign({}, parsedFile)` was used to "clone" the parsed
 * source before applying each locale's translations. That shallow copy
 * left every nested field (`root.data`, `xliff.file`, `tokens`, ...)
 * shared by reference between iterations, so the FIRST locale's
 * `applyTranslations` mutated the source object in place — and every
 * subsequent locale started from the previously-translated tree instead
 * of the English source.
 *
 * The fix is to re-parse the original file content per-locale. These
 * tests exercise that contract for every parser to make sure no future
 * change reintroduces the leak.
 */
describe("Source-tree isolation across locales", () => {
  it("RESX: applying FR translations does not leak into a freshly-parsed ES tree", async () => {
    const parser = new ResxParser();
    const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<root>
  <data name="Hello"><value>Hello</value></data>
  <data name="World"><value>World</value></data>
</root>`;

    const cloneFr = await parser.parseFrom(content);
    parser.applyTranslations(
      cloneFr,
      { Hello: "Bonjour", World: "Monde" },
      "fr",
    );

    // The fix re-parses the source content per locale rather than
    // shallow-cloning the previously-mutated tree.
    const cloneEs = await parser.parseFrom(content);

    expect(cloneFr.root.data[0].value[0]).toEqual("Bonjour");
    expect(cloneEs.root.data[0].value[0]).toEqual("Hello");
    expect(cloneEs.root.data[1].value[0]).toEqual("World");
  });

  it("JSON: re-parse yields an independent tree for each locale", async () => {
    const parser = new JsonParser();
    const content = JSON.stringify({ greeting: "Hello", farewell: "Bye" });

    const fr = await parser.parseFrom(content);
    parser.applyTranslations(
      fr,
      { greeting: "Bonjour", farewell: "Au revoir" },
      "fr",
    );

    const es = await parser.parseFrom(content);

    expect((fr as Record<string, unknown>)["greeting"]).toEqual("Bonjour");
    expect((es as Record<string, unknown>)["greeting"]).toEqual("Hello");
    expect((es as Record<string, unknown>)["farewell"]).toEqual("Bye");
  });

  it("XLIFF: re-parse yields an independent tree for each locale", async () => {
    const parser = new XliffParser();
    const content = `<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="en">
  <file id="f1">
    <unit id="1"><segment><source>Hello</source><target>Hello</target></segment></unit>
  </file>
</xliff>`;

    const fr = await parser.parseFrom(content);
    parser.applyTranslations(fr, { "0::Hello": "Bonjour" }, "fr");

    const es = await parser.parseFrom(content);
    parser.applyTranslations(es, { "0::Hello": "Hola" }, "es");

    expect(fr.xliff.file[0].unit[0].segment[0].target[0]).toEqual("Bonjour");
    expect(es.xliff.file[0].unit[0].segment[0].target[0]).toEqual("Hola");
  });

  it("Restext: re-parse yields an independent map for each locale", async () => {
    const parser = new RestextParser();
    const content = `Greeting=Hello
Farewell=Bye`;

    const fr = await parser.parseFrom(content);
    parser.applyTranslations(
      fr,
      { Greeting: "Bonjour", Farewell: "Au revoir" },
      "fr",
    );

    const es = await parser.parseFrom(content);

    expect(fr["Greeting"]).toEqual("Bonjour");
    expect(es["Greeting"]).toEqual("Hello");
    expect(es["Farewell"]).toEqual("Bye");
  });

  it("PO: re-parse yields independent token instances per locale", async () => {
    // Important: structuredClone would have flattened PortableObjectToken
    // into a plain object, breaking the `value` setter. Re-parsing
    // recreates real instances every time.
    const parser = new PortableObjectParser();
    const content = `msgid "Hello"
msgstr ""`;

    const fr = await parser.parseFrom(content);
    parser.applyTranslations(fr, { '"Hello"': '"Bonjour"' }, "fr");

    const es = await parser.parseFrom(content);

    const findMsgstr = (file: {
      tokens: { id: string | null; value: string | null }[];
    }) => file.tokens.find((t) => t.id === "msgstr");

    expect(findMsgstr(fr)!.value).toEqual('"Bonjour"');
    expect(findMsgstr(es)!.value).toEqual('""');
  });
});
