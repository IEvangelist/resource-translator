import { resolve } from "path";
import { readFile } from "../../src/io/reader-writer";
import { PortableObjectParser } from "../../src/parsers/po-parser";

const parser = new PortableObjectParser();

describe("PortableObjectParser fixture round-trip", () => {
  it.each(["fr.po", "cs.po"])(
    "round-trips %s byte-for-byte",
    async (fixture) => {
      const content = readFile(resolve(__dirname, "../data", fixture));
      const parsed = await parser.parseFrom(content);
      const formatted = parser.toFileFormatted(parsed, "");
      expect(formatted).toEqual(content);
    },
  );

  it("preserves multiple plural msgstr forms when applying translations", async () => {
    const content = readFile(resolve(__dirname, "../data/cs.po"));
    const parsed = await parser.parseFrom(content);

    const result = parser.applyTranslations(parsed, {
      '"Hello world!"': '"Hi planet!"',
    });

    // applyTranslations updates token.value (consumed by writers that walk the token list)
    const msgstrTokens = result.tokens.filter((t) =>
      t.id?.startsWith("msgstr"),
    );
    expect(msgstrTokens.find((t) => t.value === '"Hi planet!"')).toBeDefined();
    expect(
      msgstrTokens.some((t) => t.value === '"Existuje jedna položka."'),
    ).toBeTruthy();
    expect(
      msgstrTokens.some((t) => t.value === '"Existují {0} položky."'),
    ).toBeTruthy();
    expect(
      msgstrTokens.some((t) => t.value === '"Existuje {0} položek."'),
    ).toBeTruthy();
  });

  it("creates a translatable text map for the source", async () => {
    const content = readFile(resolve(__dirname, "../data/fr.po"));
    const parsed = await parser.parseFrom(content);
    const map = parser.toTranslatableTextMap(parsed).text;

    expect(map.get('"There is one item."')).toEqual('"There is one item."');
    expect(map.get('"There are {0} items."')).toEqual('"There are {0} items."');
  });
});
