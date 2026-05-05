import { translationFileParserFactory } from "../../src/factories/translation-file-parser-factory";
import { JsonParser } from "../../src/parsers/json-parser";
import { PortableObjectParser } from "../../src/parsers/po-parser";
import { RestextParser } from "../../src/parsers/restext-parser";
import { ResxParser } from "../../src/parsers/resx-parser";
import { XliffParser } from "../../src/parsers/xliff-parser";

describe("translationFileParserFactory", () => {
  it.each([
    ["resx", ResxParser],
    ["xliff", XliffParser],
    ["restext", RestextParser],
    ["ini", RestextParser],
    ["po", PortableObjectParser],
    ["json", JsonParser],
  ] as const)("returns the %s parser", (kind, expectedCtor) => {
    const parser = translationFileParserFactory(kind);
    expect(parser).toBeInstanceOf(expectedCtor);
  });

  it("throws on unknown kind", () => {
    expect(() => translationFileParserFactory("unknown" as never)).toThrow(
      /Unrecognized resource kind/,
    );
  });
});
