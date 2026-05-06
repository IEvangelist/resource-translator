import { setFailed } from "@actions/core";
import {
  getAvailableTranslations,
  translate,
} from "../src/api/translation-api";
import { ResourceFile } from "../src/file-formats/resource-file";
import { ResxParser } from "../src/parsers/resx-parser";

// Mock the Azure SDK at module scope. The factory only sets up jest.fn()
// stubs; per-test wiring (return values, status discrimination) lives in
// `beforeEach` so each test is isolated.
jest.mock("@azure-rest/ai-translation-text", () => ({
  __esModule: true,
  default: jest.fn(),
  isUnexpected: jest.fn(),
}));

jest.mock("@actions/core");

import createClient, { isUnexpected } from "@azure-rest/ai-translation-text";

const mockedCreateClient = createClient as unknown as jest.Mock;
const mockedIsUnexpected = isUnexpected as unknown as jest.Mock;

let mockGet: jest.Mock;
let mockPost: jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  mockGet = jest.fn();
  mockPost = jest.fn();

  // Each `createClient` call returns a fresh client; `client.path("/x")`
  // dispatches to the right verb stub. Returning the same `mockGet` /
  // `mockPost` from every `path()` invocation keeps assertions simple
  // (one shared call log per HTTP verb).
  mockedCreateClient.mockImplementation(() => ({
    path: (path: string) => {
      if (path === "/languages") return { get: mockGet };
      if (path === "/translate") return { post: mockPost };
      throw new Error(`Unexpected path: ${path}`);
    },
  }));

  // Default discriminator: any 2xx status is "expected". Tests that need
  // to simulate Translator's typed 4xx/5xx envelope override this.
  mockedIsUnexpected.mockImplementation((response: { status: string }) => {
    const status = String(response?.status ?? "200");
    return !status.startsWith("2");
  });
});

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
  mockGet.mockResolvedValueOnce({ status: "200", body: fakeTranslations });

  const translations = await getAvailableTranslations();

  expect(translations).toBeTruthy();
  // The /languages endpoint is anonymous and pinned to the global Microsoft
  // Translator host regardless of how the user has configured their resource.
  expect(mockedCreateClient).toHaveBeenCalledWith(
    "https://api.cognitive.microsofttranslator.com",
    expect.objectContaining({ apiVersion: "3.0" }),
  );
  expect(mockGet).toHaveBeenCalledWith({
    queryParameters: { scope: "translation" },
  });
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

  mockPost.mockResolvedValueOnce({
    status: "200",
    body: [
      {
        translations: [
          { to: "fr", text: "Salut" },
          { to: "es", text: "Hola" },
        ],
      },
    ],
  });

  const text = new Map<string, string>([["Greeting", "Hello"]]);
  const result = await translate(
    translatorResource,
    ["fr", "es"],
    text,
    "f.resx",
  );

  expect(result).toBeDefined();
  // The SDK client is instantiated with the user-configured endpoint AND a
  // matching `baseUrl` so we sidestep the SDK's automatic v3 path-rewriting
  // for *.cognitiveservices.azure.com hosts (preserves byte-compat with the
  // pre-migration axios behavior).
  expect(mockedCreateClient).toHaveBeenCalledWith(
    "https://api.cognitive.microsofttranslator.com/",
    expect.objectContaining({
      baseUrl: "https://api.cognitive.microsofttranslator.com/",
      apiVersion: "3.0",
    }),
  );
  expect(mockPost).toHaveBeenCalledTimes(1);
  const args = mockPost.mock.calls[0][0];
  expect(args.queryParameters.to).toBe("fr,es");
  expect(args.headers["Ocp-Apim-Subscription-Key"]).toBe("key-123");
  expect(args.headers["Ocp-Apim-Subscription-Region"]).toBe("westus");
  expect(args.headers["X-ClientTraceId"]).toMatch(/^[0-9a-f-]{36}$/i);
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

  mockPost.mockResolvedValueOnce({
    status: "200",
    body: [{ translations: [{ to: "fr", text: "Salut" }] }],
  });

  await translate(
    translatorResource,
    ["fr"],
    new Map<string, string>([["Greeting", "Hello"]]),
    "f.resx",
  );

  const params = mockPost.mock.calls[0][0].queryParameters;
  expect(params.from).toBe("en");
  expect(params.category).toBe("legal-en");
  expect(params.textType).toBe("html");
  expect(params.profanityAction).toBe("Marked");
  expect(params.profanityMarker).toBe("Tag");
  expect(params.allowFallback).toBe(true);
});

test("API: translate serializes allowFallback=false explicitly", async () => {
  // `false` is a meaningful value — the request must include it (not omit it).
  const translatorResource = {
    endpoint: "https://api.cognitive.microsofttranslator.com/",
    subscriptionKey: "key-123",
    allowFallback: false,
  };

  mockPost.mockResolvedValueOnce({
    status: "200",
    body: [{ translations: [{ to: "fr", text: "Salut" }] }],
  });

  await translate(
    translatorResource,
    ["fr"],
    new Map<string, string>([["Greeting", "Hello"]]),
    "f.resx",
  );

  const params = mockPost.mock.calls[0][0].queryParameters;
  expect(params).toHaveProperty("allowFallback", false);
});

test("API: translate omits profanityMarker when profanityAction !== 'Marked'", async () => {
  const translatorResource = {
    endpoint: "https://api.cognitive.microsofttranslator.com/",
    subscriptionKey: "key-123",
    profanityAction: "Deleted" as const,
    // marker is meaningless without Marked — should not be sent
    profanityMarker: "Asterisk" as const,
  };

  mockPost.mockResolvedValueOnce({
    status: "200",
    body: [{ translations: [{ to: "fr", text: "Salut" }] }],
  });

  await translate(
    translatorResource,
    ["fr"],
    new Map<string, string>([["Greeting", "Hello"]]),
    "f.resx",
  );

  const params = mockPost.mock.calls[0][0].queryParameters;
  expect(params.profanityAction).toBe("Deleted");
  expect(params).not.toHaveProperty("profanityMarker");
});

test("API: translate fails gracefully when the SDK throws a transport error", async () => {
  // Regression: the prior axios-shaped error parser used to dereference
  // `error.response.data.error` without a null-check, throwing a follow-on
  // TypeError that escaped the catch and aborted the whole run. The SDK
  // now surfaces network failures as plain Error/RestError instances —
  // make sure we still degrade gracefully and write a clean setFailed.
  const networkError = new Error("ECONNRESET: socket hang up");
  mockPost.mockRejectedValueOnce(networkError);

  const result = await translate(
    {
      endpoint: "https://api.cognitive.microsofttranslator.com/",
      subscriptionKey: "k",
    },
    ["fr"],
    new Map<string, string>([["Greeting", "Hello"]]),
    "f.resx",
  );

  expect(result).toBeUndefined();
  const setFailedMock = setFailed as jest.MockedFunction<typeof setFailed>;
  expect(setFailedMock).toHaveBeenCalledWith(
    expect.stringContaining("Failed to translate input"),
  );
  expect(setFailedMock).toHaveBeenCalledWith(
    expect.stringContaining("ECONNRESET"),
  );
});

test("API: translate surfaces the Azure error code and message when present", async () => {
  // Happy path for the typed error branch — the SDK does NOT throw on
  // 4xx/5xx; it returns the response, and `isUnexpected` flags it. We then
  // pull `body.error.{code, message}` straight into the failure message
  // (same wire format as the previous axios implementation).
  mockPost.mockResolvedValueOnce({
    status: "401",
    body: {
      error: { code: 401000, message: "The request is not authorized." },
    },
  });

  const result = await translate(
    {
      endpoint: "https://api.cognitive.microsofttranslator.com/",
      subscriptionKey: "bad-key",
    },
    ["fr"],
    new Map<string, string>([["Greeting", "Hello"]]),
    "f.resx",
  );

  expect(result).toBeUndefined();
  const setFailedMock = setFailed as jest.MockedFunction<typeof setFailed>;
  expect(setFailedMock).toHaveBeenCalledWith(
    expect.stringContaining("code: 401000"),
  );
  expect(setFailedMock).toHaveBeenCalledWith(
    expect.stringContaining("The request is not authorized."),
  );
});

test("API: getAvailableTranslations throws when the SDK returns an unexpected status", async () => {
  mockGet.mockResolvedValueOnce({
    status: "500",
    body: { error: { code: 500000, message: "languages backend down" } },
  });

  await expect(getAvailableTranslations()).rejects.toThrow(
    /languages backend down/,
  );
});

test("API: getAvailableTranslations falls back to HTTP status when error body is missing", async () => {
  mockGet.mockResolvedValueOnce({ status: "503", body: undefined });

  await expect(getAvailableTranslations()).rejects.toThrow(/HTTP 503/);
});

test("API: translate handles the legacy axios-shaped error envelope thrown from the SDK", async () => {
  // Backwards-compatibility: any caller (or third-party policy) that throws
  // the previous `{ response: { data: { error: { code, message } } } }`
  // shape directly should still produce a clean setFailed instead of an
  // uncaught TypeError.
  const legacyError = {
    response: {
      data: { error: { code: 401000, message: "legacy unauthorized" } },
    },
  };
  mockPost.mockRejectedValueOnce(legacyError);

  const result = await translate(
    {
      endpoint: "https://api.cognitive.microsofttranslator.com/",
      subscriptionKey: "k",
    },
    ["fr"],
    new Map<string, string>([["Greeting", "Hello"]]),
    "f.resx",
  );

  expect(result).toBeUndefined();
  const setFailedMock = setFailed as jest.MockedFunction<typeof setFailed>;
  expect(setFailedMock).toHaveBeenCalledWith(
    expect.stringContaining("legacy unauthorized"),
  );
});

test("API: translate handles a typed Translator error response without code/message", async () => {
  // When `response.body.error` exists but has neither code nor message, we
  // fall back to the generic HTTP-status failure message.
  mockPost.mockResolvedValueOnce({
    status: "418",
    body: { error: {} },
  });

  const result = await translate(
    {
      endpoint: "https://api.cognitive.microsofttranslator.com/",
      subscriptionKey: "k",
    },
    ["fr"],
    new Map<string, string>([["Greeting", "Hello"]]),
    "f.resx",
  );

  expect(result).toBeUndefined();
  const setFailedMock = setFailed as jest.MockedFunction<typeof setFailed>;
  expect(setFailedMock).toHaveBeenCalledWith(
    expect.stringContaining("HTTP 418"),
  );
});
