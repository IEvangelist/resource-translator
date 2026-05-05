import { resolve } from "path";
import { readFile } from "../../src/io/reader-writer";
import { RestextParser } from "../../src/parsers/restext-parser";

const parser = new RestextParser();

describe("RestextParser INI fixtures", () => {
  it("parses INI-style content (used for both .ini and .restext)", async () => {
    const content = readFile(resolve(__dirname, "../data/Test.en.ini"));
    const file = await parser.parseFrom(content);

    expect(file["Hello"]).toEqual("Hello there");
    expect(file["Farewell"]).toEqual("Goodbye for now");
    expect(file["One"]).toEqual("Just one");
    expect(file["Two"]).toEqual("A pair");
  });

  it("round-trips INI content preserving comments and section headers", async () => {
    const content = readFile(resolve(__dirname, "../data/Test.en.ini"));
    const file = await parser.parseFrom(content);
    const formatted = parser.toFileFormatted(file, "");

    expect(formatted).toEqual(content);
  });
});
