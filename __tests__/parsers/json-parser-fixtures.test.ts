import { resolve } from "path";
import { readFile } from "../../src/io/reader-writer";
import { JsonParser } from "../../src/parsers/json-parser";

jest.mock("@actions/core", () => ({
  ...jest.requireActual("@actions/core"),
  warning: jest.fn(),
}));

const parser = new JsonParser();

describe("JsonParser fixture round-trip", () => {
  const fixturePath = resolve(__dirname, "../data/Settings.en.json");

  it("parses fixture content and exposes flattened keys", async () => {
    const content = readFile(fixturePath);
    const file = await parser.parseFrom(content);

    expect(file).toBeTruthy();
    expect(file[`app${JsonParser.DELIMITER}title`]).toEqual(
      "Resource Translator",
    );
    expect(file[`messages${JsonParser.DELIMITER}welcome`]).toEqual(
      "Welcome, {{name}}!",
    );
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
    const content = JSON.stringify(
      { café: "espresso", 日本: "Japan" },
      null,
      "\t",
    );
    const file = await parser.parseFrom(content);
    expect(file["café"]).toEqual("espresso");
    expect(file["日本"]).toEqual("Japan");
    expect(parser.toFileFormatted(file, "")).toEqual(content);
  });

  it("throws a helpful error when content is not JSON", () => {
    expect(() => parser.parseFrom("not json")).toThrow(/Failed to parse json/);
  });

  it("does not crash on null values; round-trips them verbatim", async () => {
    // Regression: Object.entries(null) used to throw "Cannot convert
    // undefined or null to object", aborting the entire file's translation.
    const content = JSON.stringify(
      { ok: "Hello", missing: null, nested: { also_missing: null } },
      null,
      "\t",
    );
    const file = await parser.parseFrom(content);
    expect(file["ok"]).toEqual("Hello");
    expect(file["missing"]).toBeNull();
    expect(parser.toFileFormatted(file, "")).toEqual(content);
  });

  it("preserves number, boolean, and array values verbatim through round-trip", async () => {
    const content = JSON.stringify(
      {
        title: "Resource Translator",
        version: 3,
        production: true,
        choices: ["yes", "no", "maybe"],
        nested: { count: 5, ready: false },
      },
      null,
      "\t",
    );
    const file = await parser.parseFrom(content);

    // strings flatten, non-strings preserve at the leaf path
    expect(file["title"]).toEqual("Resource Translator");
    expect(file["version"]).toEqual(3);
    expect(file["production"]).toEqual(true);
    expect(file["choices"]).toEqual(["yes", "no", "maybe"]);
    expect(file[`nested${JsonParser.DELIMITER}count`]).toEqual(5);
    expect(file[`nested${JsonParser.DELIMITER}ready`]).toEqual(false);

    // round-trip preserves the original document byte-for-byte
    expect(parser.toFileFormatted(file, "")).toEqual(content);
  });

  it("only emits string values into the translatable text map", async () => {
    const content = JSON.stringify(
      {
        title: "Hello",
        version: 3,
        flag: true,
        gone: null,
        choices: ["a", "b"],
      },
      null,
      "\t",
    );
    const file = await parser.parseFrom(content);
    const map = parser.toTranslatableTextMap(file).text;

    expect(Array.from(map.keys())).toEqual(["title"]);
    expect(map.get("title")).toEqual("Hello");
  });

  it("applyTranslations refuses to overwrite a non-string source value", async () => {
    // Defense in depth — even if Azure mistakenly returns a translation
    // keyed off a numeric/boolean/array entry, we never replace the
    // preserved value with a string.
    const content = JSON.stringify({ title: "Hi", version: 3 }, null, "\t");
    const file = await parser.parseFrom(content);
    parser.applyTranslations(file, {
      title: "Bonjour",
      version: "v3.0", // simulated stray translation; must be ignored
    });
    expect(file["title"]).toEqual("Bonjour");
    expect(file["version"]).toEqual(3);
  });

  it("rejects top-level non-object JSON (arrays, primitives) with a clear error", () => {
    expect(() => parser.parseFrom("[]")).toThrow(
      /Top-level JSON must be an object/,
    );
    expect(() => parser.parseFrom('"a string"')).toThrow(
      /Top-level JSON must be an object/,
    );
    expect(() => parser.parseFrom("null")).toThrow(
      /Top-level JSON must be an object/,
    );
  });

  it("warns once when a string-bearing array is encountered", async () => {
    // Real-world i18n payloads sometimes use arrays for plural forms /
    // select options. We deliberately preserve those verbatim instead of
    // translating them, but a silent skip would let users ship English in
    // their localized output. The parser emits a single warning per file
    // so the operator can restructure into nested objects if needed.
    const warning = jest.requireMock("@actions/core")
      .warning as jest.MockedFunction<(msg: string) => void>;
    warning.mockClear();

    const content = JSON.stringify({
      title: "Hi",
      choices: ["yes", "no"],
      more: ["maybe"],
    });
    await parser.parseFrom(content);

    // ONE warning per file even with multiple string-bearing arrays.
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning.mock.calls[0][0]).toMatch(/array values are preserved/);
  });

  it("does NOT warn when arrays contain only non-strings", async () => {
    const warning = jest.requireMock("@actions/core")
      .warning as jest.MockedFunction<(msg: string) => void>;
    warning.mockClear();

    const content = JSON.stringify({ title: "Hi", numbers: [1, 2, 3] });
    await parser.parseFrom(content);

    expect(warning).not.toHaveBeenCalled();
  });
});
