import { RestextParser } from "../../src/parsers/restext-parser";

const parser = new RestextParser();

test("RESTEXT PARSER: correctly parses from string", async () => {
  const content = `; Title section
[Title Section]
Title=Title Casing For The Win

; General section
[General strings, etc]
Strings=This is the first string, in a series of several.
Message=Button is clicked!`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();
  expect(file["Title"]).toEqual("Title Casing For The Win");
  expect(file["Strings"]).toEqual(
    "This is the first string, in a series of several.",
  );
  expect(file["Message"]).toEqual("Button is clicked!");
});

test("RESTEXT PARSER: correctly formats back as string", async () => {
  const content = `; Title section
[Title Section]
Title=Title Casing For The Win

; General section
[General strings, etc]
Strings=This is the first string, in a series of several.
Message=Button is clicked!`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();

  const fileFormatted = parser.toFileFormatted(file, "");
  expect(fileFormatted).toEqual(content);
});

test("RESTEXT PARSER: correctly applies translations", async () => {
  const content = `; Title section
[Title Section]
Title=Title Casing For The Win

; General section
[General strings, etc]
Strings=This is the first string, in a series of several.
Message=Button is clicked!`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();

  const result = parser.applyTranslations(file, {
    Strings: "Does this work?",
  });

  expect(result).toBeTruthy();
  expect(result["Title"]).toEqual("Title Casing For The Win");
  expect(result["Strings"]).toEqual("Does this work?");
  expect(result["Message"]).toEqual("Button is clicked!");
});

test("RESTEXT PARSER: correctly creates translatable text map", async () => {
  const content = `; Title section
[Title Section]
Title=Title Casing For The Win

; General section
[General strings, etc]
Strings=This is the first string, in a series of several.
Message=Button is clicked!`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();

  const translatableTextMap = parser.toTranslatableTextMap(file);
  expect(translatableTextMap).toBeTruthy();
  expect(translatableTextMap.text.get("Title")).toEqual(
    "Title Casing For The Win",
  );
  expect(translatableTextMap.text.get("Strings")).toEqual(
    "This is the first string, in a series of several.",
  );
  expect(translatableTextMap.text.get("Message")).toEqual("Button is clicked!");
});

describe("RestextParser edge cases", () => {
  it("preserves '=' inside values (URLs, query strings, equations)", async () => {
    // Regression: line.split('=') used to truncate values containing '='.
    // We now split on the FIRST '=' only.
    const content = `Url=https://example.com/?a=1&b=2
Equation=x=y+z
Empty=
WithEquals=a=b=c`;
    const file = await parser.parseFrom(content);

    expect(file["Url"]).toEqual("https://example.com/?a=1&b=2");
    expect(file["Equation"]).toEqual("x=y+z");
    expect(file["Empty"]).toEqual("");
    expect(file["WithEquals"]).toEqual("a=b=c");

    // And the round-trip writes them back unchanged.
    expect(parser.toFileFormatted(file, "")).toEqual(content);
  });

  it("returns the defaultValue when given empty content", async () => {
    const file = await parser.parseFrom("");
    expect(parser.toFileFormatted(file, "default")).toEqual("default");
  });

  it("preserves verbatim lines that have no '=' separator", async () => {
    const content = `; comment
[Section]
Key=value
StrayLineWithoutEquals
Another=ok`;
    const file = await parser.parseFrom(content);
    expect(file["Key"]).toEqual("value");
    expect(file["Another"]).toEqual("ok");
    expect(parser.toFileFormatted(file, "")).toEqual(content);
  });

  it("applies translations and re-emits cleanly", async () => {
    const content = `[Section]
Url=https://example.com/?a=1
Title=Hello`;
    const file = await parser.parseFrom(content);
    parser.applyTranslations(file, {
      Url: "https://example.com/?a=1", // unchanged
      Title: "Bonjour",
    });
    const out = parser.toFileFormatted(file, "");
    expect(out).toContain("Url=https://example.com/?a=1");
    expect(out).toContain("Title=Bonjour");
  });
});
