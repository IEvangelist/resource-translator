import { ResxParser } from "../../src/parsers/resx-parser";

const parser = new ResxParser();

test("RESX PARSER: correctly parses from string", async () => {
  const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<root>
  <data name="Greetings" xml:space="preserve">
    <value>Hello world, this is a test.... only a test!</value>
  </data>
  <data name="MyFriend" xml:space="preserve">
    <value>Where have you gone?</value>
  </data>
</root>`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();
  expect(
    file.root.data.find((d) => d.$.name === "Greetings")!.value[0],
  ).toEqual("Hello world, this is a test.... only a test!");
  expect(file.root.data.find((d) => d.$.name === "MyFriend")!.value[0]).toEqual(
    "Where have you gone?",
  );
});

test("RESX PARSER: correctly formats back as string", async () => {
  const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<root>
  <data name="Greetings" xml:space="preserve">
    <value>Hello world, this is a test.... only a test!</value>
  </data>
  <data name="MyFriend" xml:space="preserve">
    <value>Where have you gone?</value>
  </data>
</root>`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();

  const fileFormatted = parser.toFileFormatted(file, "");
  expect(fileFormatted).toEqual(content);
});

test("RESX PARSER: correctly applies translations", async () => {
  const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<root>
  <data name="Greetings" xml:space="preserve">
    <value>Hello world, this is a test.... only a test!</value>
  </data>
  <data name="MyFriend" xml:space="preserve">
    <value>Where have you gone?</value>
  </data>
</root>`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();

  const result = parser.applyTranslations(file, {
    Greetings: "I am a robot!",
  });

  expect(result).toBeTruthy();
  expect(
    result.root.data.find((d) => d.$.name === "Greetings")!.value[0],
  ).toEqual("I am a robot!");
  expect(
    result.root.data.find((d) => d.$.name === "MyFriend")!.value[0],
  ).toEqual("Where have you gone?");
});

test("RESX PARSER: correctly creates translatable text map", async () => {
  const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<root>
  <data name="Greetings" xml:space="preserve">
    <value>Hello world, this is a test.... only a test!</value>
  </data>
  <data name="MyFriend" xml:space="preserve">
    <value>Where have you gone?</value>
  </data>
</root>`;

  const file = await parser.parseFrom(content);
  expect(file).toBeTruthy();

  const translatableTextMap = parser.toTranslatableTextMap(file);
  expect(translatableTextMap).toBeTruthy();
  expect(translatableTextMap.text.get("Greetings")).toEqual(
    "Hello world, this is a test.... only a test!",
  );
  expect(translatableTextMap.text.get("MyFriend")).toEqual(
    "Where have you gone?",
  );
});

describe("ResxParser non-translatable entries", () => {
  // Real-world .resx files mix string entries with file references and
  // base64-encoded binary blobs. Sending those values to Azure would corrupt
  // them on output (file refs become "type;path" strings; binaries become
  // gibberish). The parser must skip them on BOTH the read and write paths.
  const content = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<root>
  <data name="Greetings" xml:space="preserve">
    <value>Hello world.</value>
  </data>
  <data name="IconRef" type="System.Resources.ResXFileRef, System.Windows.Forms">
    <value>icon.ico;System.Drawing.Icon, System.Drawing</value>
  </data>
  <data name="LogoBlob" mimetype="application/x-microsoft.net.object.bytearray.base64">
    <value>AAECAwQFBgcICQ==</value>
  </data>
</root>`;

  it("excludes file-ref entries (data with $.type) from the translatable map", async () => {
    const file = await parser.parseFrom(content);
    const map = parser.toTranslatableTextMap(file).text;

    expect(map.has("Greetings")).toBe(true);
    expect(map.has("IconRef")).toBe(false);
    expect(map.has("LogoBlob")).toBe(false);
  });

  it("never overwrites file-ref or binary values, even when keys collide", async () => {
    const file = await parser.parseFrom(content);

    // Even if Azure (or a misconfigured glossary) returned a stray
    // translation keyed off IconRef/LogoBlob, applyTranslations must NOT
    // replace those values.
    parser.applyTranslations(file, {
      Greetings: "Hola mundo.",
      IconRef: "MALICIOUS",
      LogoBlob: "MALICIOUS",
    });

    const greet = file.root.data.find((d) => d.$.name === "Greetings");
    const iconRef = file.root.data.find((d) => d.$.name === "IconRef");
    const logoBlob = file.root.data.find((d) => d.$.name === "LogoBlob");

    expect(greet!.value[0]).toEqual("Hola mundo.");
    expect(iconRef!.value[0]).toEqual(
      "icon.ico;System.Drawing.Icon, System.Drawing",
    );
    expect(logoBlob!.value[0]).toEqual("AAECAwQFBgcICQ==");
  });
});
