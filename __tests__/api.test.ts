import { setFailed } from "@actions/core";
import Axios from "axios";
import {
  getAvailableTranslations,
  translate,
} from "../src/api/translation-api";
import { ResourceFile } from "../src/file-formats/resource-file";
import { ResxParser } from "../src/parsers/resx-parser";

jest.mock("axios");
const mockedAxios = Axios as jest.Mocked<typeof Axios>;

jest.mock("@actions/core");

const expectedLocales = [
  "af",
  "am",
  "ar",
  "as",
  "az",
  "bg",
  "bn",
  "bs",
  "ca",
  "cs",
  "cy",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "fa",
  "fi",
  "fil",
  "fj",
  "fr",
  "fr-CA",
  "ga",
  "gu",
  "he",
  "hi",
  "hr",
  "ht",
  "hu",
  "hy",
  "id",
  "is",
  "it",
  "iu",
  "ja",
  "kk",
  "km",
  "kmr",
  "kn",
  "ko",
  "ku",
  "lo",
  "lt",
  "lv",
  "mg",
  "mi",
  "ml",
  "mr",
  "ms",
  "mt",
  "mww",
  "my",
  "nb",
  "ne",
  "nl",
  "or",
  "otq",
  "pa",
  "pl",
  "prs",
  "ps",
  "pt",
  "pt-PT",
  "ro",
  "ru",
  "sk",
  "sl",
  "sm",
  "sq",
  "sr-Cyrl",
  "sr-Latn",
  "sv",
  "sw",
  "ta",
  "te",
  "th",
  "ti",
  "tlh-Latn",
  "tlh-Piqd",
  "to",
  "tr",
  "ty",
  "uk",
  "ur",
  "vi",
  "yua",
  "yue",
  "zh-Hans",
  "zh-Hant",
];

const parser = new ResxParser();

jest.setTimeout(60000);

test("API: translate fails to process too long text", async () => {
  const longTextLength = 10 * 1000;
  const resourceXml: ResourceFile = {
    root: {
      data: [
        { $: { name: "Key1" }, value: ["a".repeat(longTextLength)] },
        { $: { name: "Key2" }, value: ["b".repeat(longTextLength)] },
      ],
    },
  };

  const filePath = "file-path";
  const expectedError = resourceXml.root.data
    .map(
      (data) =>
        `Text for key '${data.$.name}' in file '${filePath}' is too long (${
          longTextLength + 2
        }). Must be ${longTextLength} at most.`,
    )
    .join("\r\n");

  const translatableTextMap = parser.toTranslatableTextMap(resourceXml);
  const translatorResource = { endpoint: "", subscriptionKey: "" };
  const resultSet = await translate(
    translatorResource,
    [],
    translatableTextMap.text,
    filePath,
  );

  expect(resultSet).toBeUndefined();
  const setFailedMock = setFailed as jest.MockedFunction<typeof setFailed>;
  expect(setFailedMock).toHaveBeenCalledWith(expectedError);
});

test("API: get available translations resolves the public languages endpoint", async () => {
  const fakeTranslations = {
    translation: Object.fromEntries(
      expectedLocales.map((locale) => [
        locale,
        { name: locale, nativeName: locale, dir: "ltr" },
      ]),
    ),
  };
  mockedAxios.get.mockResolvedValueOnce({ data: fakeTranslations } as any);

  const translations = await getAvailableTranslations();

  expect(translations).toBeTruthy();
  expect(mockedAxios.get).toHaveBeenCalledWith(
    expect.stringContaining("api.cognitive.microsofttranslator.com/languages"),
  );
  const locales = Object.keys(translations.translation);
  expect(
    locales.every((locale) => expectedLocales.includes(locale)),
  ).toBeTruthy();
});

test("API: translate posts to the configured endpoint with the right headers", async () => {
  const translatorResource = {
    endpoint: "https://api.cognitive.microsofttranslator.com/",
    subscriptionKey: "key-123",
    region: "westus",
  };

  mockedAxios.post.mockResolvedValueOnce({
    data: [
      {
        translations: [
          { to: "fr", text: "Salut" },
          { to: "es", text: "Hola" },
        ],
      },
    ],
  } as any);

  const text = new Map<string, string>([["Greeting", "Hello"]]);
  const result = await translate(
    translatorResource,
    ["fr", "es"],
    text,
    "f.resx",
  );

  expect(result).toBeDefined();
  expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  const call = mockedAxios.post.mock.calls[0];
  expect(call[0]).toContain("/translate?api-version=3.0");
  expect(call[0]).toContain("to=fr");
  expect(call[0]).toContain("to=es");
  const opts = call[2] as any;
  expect(opts.headers["Ocp-Apim-Subscription-Key"]).toBe("key-123");
  expect(opts.headers["Ocp-Apim-Subscription-Region"]).toBe("westus");
});

test("API: translate forwards advanced Translator options as query params", async () => {
  const translatorResource = {
    endpoint: "https://api.cognitive.microsofttranslator.com/",
    subscriptionKey: "key-123",
    sourceLocale: "en",
    categoryId: "legal-en",
    textType: "html" as const,
    profanityAction: "Marked" as const,
    profanityMarker: "Tag" as const,
    allowFallback: true,
  };

  mockedAxios.post.mockResolvedValueOnce({
    data: [{ translations: [{ to: "fr", text: "Salut" }] }],
  } as any);

  await translate(
    translatorResource,
    ["fr"],
    new Map<string, string>([["Greeting", "Hello"]]),
    "f.resx",
  );

  const url = mockedAxios.post.mock.calls[0][0];
  expect(url).toContain("from=en");
  expect(url).toContain("category=legal-en");
  expect(url).toContain("textType=html");
  expect(url).toContain("profanityAction=Marked");
  expect(url).toContain("profanityMarker=Tag");
  expect(url).toContain("allowFallback=true");
});

test("API: translate serializes allowFallback=false explicitly", async () => {
  // `false` is a meaningful value — the URL must include it (not omit it).
  const translatorResource = {
    endpoint: "https://api.cognitive.microsofttranslator.com/",
    subscriptionKey: "key-123",
    allowFallback: false,
  };

  mockedAxios.post.mockResolvedValueOnce({
    data: [{ translations: [{ to: "fr", text: "Salut" }] }],
  } as any);

  await translate(
    translatorResource,
    ["fr"],
    new Map<string, string>([["Greeting", "Hello"]]),
    "f.resx",
  );

  const url = mockedAxios.post.mock.calls[0][0];
  expect(url).toContain("allowFallback=false");
});

test("API: translate omits profanityMarker when profanityAction !== 'Marked'", async () => {
  const translatorResource = {
    endpoint: "https://api.cognitive.microsofttranslator.com/",
    subscriptionKey: "key-123",
    profanityAction: "Deleted" as const,
    // marker is meaningless without Marked — should not be sent
    profanityMarker: "Asterisk" as const,
  };

  mockedAxios.post.mockResolvedValueOnce({
    data: [{ translations: [{ to: "fr", text: "Salut" }] }],
  } as any);

  await translate(
    translatorResource,
    ["fr"],
    new Map<string, string>([["Greeting", "Hello"]]),
    "f.resx",
  );

  const url = mockedAxios.post.mock.calls[0][0];
  expect(url).toContain("profanityAction=Deleted");
  expect(url).not.toContain("profanityMarker");
});
