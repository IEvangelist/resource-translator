import { resolve } from "path";
import { readFile } from "../../src/io/reader-writer";
import { JsonParser } from "../../src/parsers/json-parser";

const parser = new JsonParser();

describe("JsonParser fixture round-trip", () => {
  const fixturePath = resolve(__dirname, "../data/Settings.en.json");

  it("parses fixture content and exposes flattened keys", async () => {
    const content = readFile(fixturePath);
    const file = await parser.parseFrom(content);

    expect(file).toBeTruthy();
    expect(
      file[`app${JsonParser.DELIMITER}title`],
    ).toEqual("Resource Translator");
    expect(
      file[`messages${JsonParser.DELIMITER}welcome`],
    ).toEqual("Welcome, {{name}}!");
    expect(file["unit.dotted.key"]).toEqual("Special key with dots");
    expect(file["empty"]).toEqual("");
  });

  it("round-trips fixture JSON byte-for-byte", async () => {
    const content = readFile(fixturePath);
    const parsed = await parser.parseFrom(content);
    const formatted = parser.toFileFormatted(parsed, "");

    expect(formatted).toEqual(content);
  });

  it("applies translations and re-emits the formatted document", async () => {
    const content = readFile(fixturePath);
    const parsed = await parser.parseFrom(content);

    const result = parser.applyTranslations(parsed, {
      [`app${JsonParser.DELIMITER}title`]: "Traducteur de ressources",
      "unit.dotted.key": "Clé spéciale avec points",
    });

    expect(result[`app${JsonParser.DELIMITER}title`]).toEqual(
      "Traducteur de ressources",
    );
    expect(result["unit.dotted.key"]).toEqual("Clé spéciale avec points");

    const formatted = parser.toFileFormatted(result, "");
    expect(formatted).toContain("Traducteur de ressources");
    expect(formatted).toContain("Clé spéciale avec points");
  });
});

describe("JsonParser edge cases", () => {
  it("handles empty objects", async () => {
    const file = await parser.parseFrom("{}");
    expect(file).toEqual({});
    expect(parser.toFileFormatted(file, "")).toEqual("{}");
  });

  it("preserves unicode keys and values", async () => {
    const content = JSON.stringify({ "café": "espresso", "日本": "Japan" }, null, "\t");
    const file = await parser.parseFrom(content);
    expect(file["café"]).toEqual("espresso");
    expect(file["日本"]).toEqual("Japan");
    expect(parser.toFileFormatted(file, "")).toEqual(content);
  });

  it("throws a helpful error when content is not JSON", () => {
    expect(() => parser.parseFrom("not json")).toThrow(/Failed to parse json/);
  });
});
