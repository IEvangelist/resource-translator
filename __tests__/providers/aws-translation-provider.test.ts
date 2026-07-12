import { AwsTranslationProvider } from "../../src/providers/aws/aws-translation-provider";
import { Inputs } from "../../src/action/inputs";

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-translate", () => ({
  __esModule: true,
  TranslateClient: jest
    .fn()
    .mockImplementation((config: unknown) => ({ config, send: mockSend })),
  TranslateTextCommand: jest
    .fn()
    .mockImplementation((input: Record<string, unknown>) => ({
      _kind: "translate",
      ...input,
    })),
  ListLanguagesCommand: jest
    .fn()
    .mockImplementation((input: Record<string, unknown>) => ({
      _kind: "list",
      ...input,
    })),
  Profanity: { MASK: "MASK" },
}));

jest.mock("@actions/core");

import { setFailed } from "@actions/core";
import { TranslateClient } from "@aws-sdk/client-translate";

const mockedSetFailed = setFailed as unknown as jest.Mock;
const mockedClientCtor = TranslateClient as unknown as jest.Mock;

const makeProvider = (
  overrides: Partial<Inputs> = {},
): AwsTranslationProvider =>
  new AwsTranslationProvider({
    provider: "aws",
    sourceLocale: "en",
    awsRegion: "us-east-1",
    awsAccessKeyId: "AKIAEXAMPLE0000000000",
    awsSecretAccessKey: "secretkeyexamplevalue",
    ...overrides,
  } as Inputs);

beforeEach(() => {
  jest.clearAllMocks();
  mockSend.mockReset();
});

describe("AwsTranslationProvider", () => {
  it("lists available translations across paginated responses", async () => {
    mockSend
      .mockResolvedValueOnce({
        Languages: [{ LanguageCode: "es", LanguageName: "Spanish" }],
        NextToken: "next",
      })
      .mockResolvedValueOnce({
        Languages: [{ LanguageCode: "fr", LanguageName: "French" }],
      });

    const result = await makeProvider().getAvailableTranslations();

    expect(Object.keys(result.translation)).toEqual(["es", "fr"]);
    expect(result.translation.es.name).toBe("Spanish");
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it("translates each key per locale and restores placeholders", async () => {
    mockSend.mockImplementation(async (cmd: Record<string, string>) => {
      if (cmd._kind === "list") return { Languages: [] };
      return { TranslatedText: `[${cmd.TargetLanguageCode}] ${cmd.Text}` };
    });

    const map = new Map([["greeting", "Hello {{name}}"]]);
    const result = await makeProvider().translate(["es", "de"], map, "f.json");

    expect(result).toBeDefined();
    // Placeholder round-trips even though AWS only saw the sentinel token.
    expect(result!.es.greeting).toBe("[es] Hello {{name}}");
    expect(result!.de.greeting).toBe("[de] Hello {{name}}");
  });

  it("protects placeholders before sending (sentinel, not the raw token)", async () => {
    mockSend.mockResolvedValue({ TranslatedText: "ok" });

    await makeProvider().translate(
      ["es"],
      new Map([["k", "Hi {{name}}"]]),
      "f.json",
    );

    const translateCall = mockSend.mock.calls
      .map((c) => c[0])
      .find((c: Record<string, string>) => c._kind === "translate");
    expect(translateCall.Text).not.toContain("{{name}}");
    expect(translateCall.Text).toMatch(/RTKEEP\d{6}/);
  });

  it("sends the raw token when protectPlaceholders is false", async () => {
    mockSend.mockResolvedValue({ TranslatedText: "ok" });

    await makeProvider().translate(
      ["es"],
      new Map([["k", "Hi {{name}}"]]),
      "f.json",
      { protectPlaceholders: false },
    );

    const translateCall = mockSend.mock.calls
      .map((c) => c[0])
      .find((c: Record<string, string>) => c._kind === "translate");
    expect(translateCall.Text).toBe("Hi {{name}}");
  });

  it("maps profanityAction to AWS Settings.Profanity=MASK", async () => {
    mockSend.mockResolvedValue({ TranslatedText: "ok" });

    await makeProvider({ profanityAction: "Marked" }).translate(
      ["es"],
      new Map([["k", "v"]]),
      "f.json",
    );

    const translateCall = mockSend.mock.calls
      .map((c) => c[0])
      .find((c: Record<string, unknown>) => c._kind === "translate");
    expect(translateCall.Settings).toEqual({ Profanity: "MASK" });
  });

  it("passes AWS formality, brevity, terminology, and parallel data options", async () => {
    mockSend.mockResolvedValue({ TranslatedText: "ok" });

    await makeProvider({
      awsFormality: "FORMAL",
      awsBrevity: true,
      awsTerminologyNames: ["brand-terms"],
      awsParallelDataNames: ["domain-data"],
    }).translate(["es"], new Map([["k", "v"]]), "f.json");

    const translateCall = mockSend.mock.calls
      .map((c) => c[0])
      .find((c: Record<string, unknown>) => c._kind === "translate");
    expect(translateCall.Settings).toEqual({
      Formality: "FORMAL",
      Brevity: "ON",
    });
    expect(translateCall.TerminologyNames).toEqual(["brand-terms"]);
    expect(translateCall.ParallelDataNames).toEqual(["domain-data"]);
  });

  it("omits Settings when profanityAction is NoAction/unset", async () => {
    mockSend.mockResolvedValue({ TranslatedText: "ok" });

    await makeProvider().translate(["es"], new Map([["k", "v"]]), "f.json");

    const translateCall = mockSend.mock.calls
      .map((c) => c[0])
      .find((c: Record<string, unknown>) => c._kind === "translate");
    expect(translateCall.Settings).toBeUndefined();
  });

  it("uses explicit credentials when provided", async () => {
    mockSend.mockResolvedValue({ Languages: [] });
    await makeProvider().getAvailableTranslations();

    const config = mockedClientCtor.mock.calls[0][0];
    expect(config.region).toBe("us-east-1");
    expect(config.credentials).toEqual({
      accessKeyId: "AKIAEXAMPLE0000000000",
      secretAccessKey: "secretkeyexamplevalue",
    });
  });

  it("omits credentials to use the default chain when keys are absent", async () => {
    mockSend.mockResolvedValue({ Languages: [] });
    await makeProvider({
      awsAccessKeyId: undefined,
      awsSecretAccessKey: undefined,
    }).getAvailableTranslations();

    const config = mockedClientCtor.mock.calls[0][0];
    expect(config.credentials).toBeUndefined();
  });

  it("maps maxRetries to AWS maxAttempts (1 + maxRetries)", async () => {
    mockSend.mockResolvedValue({ TranslatedText: "ok" });
    await makeProvider().translate(["es"], new Map([["k", "v"]]), "f.json", {
      maxRetries: 3,
    });

    const config = mockedClientCtor.mock.calls[0][0];
    expect(config.maxAttempts).toBe(4);
  });

  it("fails the run (setFailed + undefined) when a value is too long", async () => {
    const tooLong = "a".repeat(10001);
    const result = await makeProvider().translate(
      ["es"],
      new Map([["k", tooLong]]),
      "f.json",
    );

    expect(result).toBeUndefined();
    expect(mockedSetFailed).toHaveBeenCalledWith(
      expect.stringContaining("too long"),
    );
  });

  it("returns undefined and calls setFailed when the SDK throws", async () => {
    mockSend.mockRejectedValue(new Error("network down"));

    const result = await makeProvider().translate(
      ["es"],
      new Map([["k", "v"]]),
      "f.json",
    );

    expect(result).toBeUndefined();
    expect(mockedSetFailed).toHaveBeenCalledWith(
      expect.stringContaining("network down"),
    );
  });

  it("throws when no region can be resolved", () => {
    const saved = {
      AWS_REGION: process.env.AWS_REGION,
      AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION,
    };
    delete process.env.AWS_REGION;
    delete process.env.AWS_DEFAULT_REGION;
    try {
      expect(() => makeProvider({ awsRegion: undefined })).toThrow(/region/i);
    } finally {
      if (saved.AWS_REGION) process.env.AWS_REGION = saved.AWS_REGION;
      if (saved.AWS_DEFAULT_REGION)
        process.env.AWS_DEFAULT_REGION = saved.AWS_DEFAULT_REGION;
    }
  });
});
