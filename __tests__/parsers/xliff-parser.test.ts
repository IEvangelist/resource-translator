import { findInXliff } from "../../src/file-formats/xliff-file";
import { XliffParser } from "../../src/parsers/xliff-parser";

const parser = new XliffParser();

test("XLIFF PARSER: correctly parses from string", async () => {
  const content = `<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="ja">
  <file id="f1" original="Graphic Example.psd">
    <skeleton href="Graphic Example.psd.skl"/>
    <unit id="1">
      <segment>
        <source>Quetzal</source>
        <target>Quetzal</target>
      </segment>
    </unit>
    <unit id="2">
      <segment>
        <source>An application to manipulate and process XLIFF documents</source>
        <target>XLIFF 文書を編集、または処理 するアプリケーションです。</target>
      </segment>
    </unit>
    <unit id="3">
      <segment>
        <source>XLIFF Data Manager</source>
        <target>XLIFF データ・マネージャ</target>
      </segment>
    </unit>
  </file>
</xliff>`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();
  expect(findInXliff(file, 0, "Quetzal")!.target[0]).toEqual("Quetzal");
  expect(
    findInXliff(
      file,
      0,
      "An application to manipulate and process XLIFF documents",
    )!.target[0],
  ).toEqual("XLIFF 文書を編集、または処理 するアプリケーションです。");
  expect(findInXliff(file, 0, "XLIFF Data Manager")!.target[0]).toEqual(
    "XLIFF データ・マネージャ",
  );
});

test("XLIFF PARSER: correctly formats back as string", async () => {
  const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="ja">
  <file id="f1" original="Graphic Example.psd">
    <skeleton href="Graphic Example.psd.skl"/>
    <unit id="1">
      <segment>
        <source>Quetzal</source>
        <target>Quetzal</target>
      </segment>
    </unit>
    <unit id="2">
      <segment>
        <source>An application to manipulate and process XLIFF documents</source>
        <target>XLIFF 文書を編集、または処理 するアプリケーションです。</target>
      </segment>
    </unit>
    <unit id="3">
      <segment>
        <source>XLIFF Data Manager</source>
        <target>XLIFF データ・マネージャ</target>
      </segment>
    </unit>
  </file>
</xliff>`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();

  const fileFormatted = parser.toFileFormatted(file, "");
  expect(fileFormatted).toEqual(content);
});

test("XLIFF PARSER: correctly applies translations", async () => {
  const content = `<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="ja">
  <file id="f1" original="Graphic Example.psd">
    <skeleton href="Graphic Example.psd.skl"/>
    <unit id="1">
      <segment>
        <source>Quetzal</source>
        <target>Quetzal</target>
      </segment>
    </unit>
    <unit id="2">
      <segment>
        <source>An application to manipulate and process XLIFF documents</source>
        <target>XLIFF 文書を編集、または処理 するアプリケーションです。</target>
      </segment>
    </unit>
    <unit id="3">
      <segment>
        <source>XLIFF Data Manager</source>
        <target>XLIFF データ・マネージャ</target>
      </segment>
    </unit>
  </file>
</xliff>`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();

  const result = parser.applyTranslations(
    file,
    {
      "0::An application to manipulate and process XLIFF documents":
        "Applying changes for testing.",
      "0::Quetzal": "Wisconsin beer is best!",
      "0::XLIFF Data Manager": "Who is in charge?",
    },
    "en",
  );

  expect(result).toBeTruthy();
  expect(result.xliff.$.trgLang).toEqual("en");
  expect(findInXliff(result, 0, "Quetzal")!.target[0]).toEqual(
    "Wisconsin beer is best!",
  );
  expect(
    findInXliff(
      result,
      0,
      "An application to manipulate and process XLIFF documents",
    )!.target[0],
  ).toEqual("Applying changes for testing.");
  expect(findInXliff(result, 0, "XLIFF Data Manager")!.target[0]).toEqual(
    "Who is in charge?",
  );
});

test("XLIFF PARSER: correctly creates translatable text map", async () => {
  const content = `<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="ja">
  <file id="f1" original="Graphic Example.psd">
    <skeleton href="Graphic Example.psd.skl"/>
    <unit id="1">
      <segment>
        <source>Quetzal</source>
        <target>Quetzal</target>
      </segment>
    </unit>
    <unit id="2">
      <segment>
        <source>An application to manipulate and process XLIFF documents</source>
        <target>XLIFF 文書を編集、または処理 するアプリケーションです。</target>
      </segment>
    </unit>
    <unit id="3">
      <segment>
        <source>XLIFF Data Manager</source>
        <target>XLIFF データ・マネージャ</target>
      </segment>
    </unit>
  </file>
</xliff>`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();

  const translatableTextMap = parser.toTranslatableTextMap(file);
  expect(translatableTextMap).toBeTruthy();
  expect(translatableTextMap.text.get("0::Quetzal")).toEqual("Quetzal");
  expect(
    translatableTextMap.text.get(
      "0::An application to manipulate and process XLIFF documents",
    ),
  ).toEqual("An application to manipulate and process XLIFF documents");
  expect(translatableTextMap.text.get("0::XLIFF Data Manager")).toEqual(
    "XLIFF Data Manager",
  );
});

describe("XliffParser edge cases", () => {
  it("preserves source text containing the '::' delimiter when applying translations", async () => {
    // Regression: the parser used to split the composite key on EVERY '::'
    // and read [1], so a source like 'foo::bar' got truncated to 'foo' and
    // the translation never landed on the matching <target>.
    const content = `<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="f1" original="x">
    <unit id="1">
      <segment>
        <source>Namespace::Class</source>
        <target>Namespace::Class</target>
      </segment>
    </unit>
    <unit id="2">
      <segment>
        <source>http://[::1]/path</source>
        <target>http://[::1]/path</target>
      </segment>
    </unit>
  </file>
</xliff>`;

    const file = await parser.parseFrom(content);
    const map = parser.toTranslatableTextMap(file).text;
    expect(map.get("0::Namespace::Class")).toEqual("Namespace::Class");
    expect(map.get("0::http://[::1]/path")).toEqual("http://[::1]/path");

    parser.applyTranslations(
      file,
      {
        "0::Namespace::Class": "Espace::Classe",
        "0::http://[::1]/path": "http://[::1]/chemin",
      },
      "fr",
    );

    expect(findInXliff(file, 0, "Namespace::Class")!.target[0]).toEqual(
      "Espace::Classe",
    );
    expect(findInXliff(file, 0, "http://[::1]/path")!.target[0]).toEqual(
      "http://[::1]/chemin",
    );
  });

  it("indexes <unit> entries across multiple <file> blocks", async () => {
    const content = `<xliff xmlns="urn:oasis:names:tc:xliff:document:2.0" version="2.0" srcLang="en" trgLang="fr">
  <file id="f1">
    <unit id="1"><segment><source>One</source><target>One</target></segment></unit>
  </file>
  <file id="f2">
    <unit id="1"><segment><source>Two</source><target>Two</target></segment></unit>
  </file>
</xliff>`;

    const file = await parser.parseFrom(content);
    const map = parser.toTranslatableTextMap(file).text;
    expect(map.get("0::One")).toEqual("One");
    expect(map.get("1::Two")).toEqual("Two");

    parser.applyTranslations(file, { "0::One": "Un", "1::Two": "Deux" }, "fr");

    expect(findInXliff(file, 0, "One")!.target[0]).toEqual("Un");
    expect(findInXliff(file, 1, "Two")!.target[0]).toEqual("Deux");
  });
});
