import { GoogleTranslationProvider } from "../../src/providers/google/google-translation-provider";
import { Inputs } from "../../src/action/inputs";

const mockTranslate = jest.fn();
const mockGetLanguages = jest.fn();

jest.mock("@google-cloud/translate", () => ({
  __esModule: true,
  v2: {
    // Reference the mock fns lazily (inside closures) so the factory can be
    // hoisted above their declarations without a temporal-dead-zone error.
    Translate: jest.fn().mockImplementation((config: unknown) => ({
      __config: config,
      translate: (...args: unknown[]) => mockTranslate(...args),
      getLanguages: (...args: unknown[]) => mockGetLanguages(...args),
    })),
  },
}));

jest.mock("@actions/core");

import { v2 } from "@google-cloud/translate";

const mockTranslateCtor = v2.Translate as unknown as jest.Mock;

const makeProvider = (
  overrides: Partial<Inputs> = {},
): GoogleTranslationProvider =>
  new GoogleTranslationProvider({
    provider: "google",
    sourceLocale: "en",
    googleApiKey: "test-api-key",
    ...overrides,
  } as Inputs);

beforeEach(() => {
  jest.clearAllMocks();
  mockTranslate.mockReset();
  mockGetLanguages.mockReset();
});

describe("GoogleTranslationProvider", () => {
  it("maps getLanguages results to AvailableTranslations", async () => {
    mockGetLanguages.mockResolvedValue([
      [
        { code: "es", name: "Spanish" },
        { code: "fr", name: "French" },
      ],
    ]);

    const result = await makeProvider().getAvailableTranslations();

    expect(Object.keys(result.translation)).toEqual(["es", "fr"]);
    expect(result.translation.fr.name).toBe("French");
  });

  it("translates and restores placeholders, defaulting format to text", async () => {
    mockTranslate.mockImplementation(
      async (segment: string[], opts: { to: string }) => [
        segment.map((s) => `[${opts.to}] ${s}`),
      ],
    );

    const map = new Map([["greeting", "Hello {{name}}"]]);
    const result = await makeProvider().translate(["es"], map, "f.json");

    expect(result!.es.greeting).toBe("[es] Hello {{name}}");
    expect(mockTranslate.mock.calls[0][1]).toEqual({
      format: "text",
      from: "en",
      to: "es",
    });
  });

  it("uses html format when textType is html", async () => {
    mockTranslate.mockResolvedValue([["x"]]);

    await makeProvider({ textType: "html" }).translate(
      ["es"],
      new Map([["k", "v"]]),
      "f.json",
    );

    expect(mockTranslate.mock.calls[0][1].format).toBe("html");
  });

  it("batches large inputs into <=100-segment requests", async () => {
    mockTranslate.mockImplementation(async (segment: string[]) => [
      segment.map(() => "t"),
    ]);

    const map = new Map<string, string>();
    for (let i = 0; i < 250; i++) map.set(`k${i}`, `v${i}`);

    await makeProvider().translate(["es"], map, "f.json");

    // 250 -> 100 + 100 + 50 = 3 requests for the single locale.
    expect(mockTranslate).toHaveBeenCalledTimes(3);
  });

  it("authenticates with an API key", async () => {
    mockGetLanguages.mockResolvedValue([[]]);
    await makeProvider().getAvailableTranslations();

    expect(mockTranslateCtor.mock.calls[0][0]).toMatchObject({
      key: "test-api-key",
    });
  });

  it("authenticates with service-account credentials", async () => {
    mockGetLanguages.mockResolvedValue([[]]);
    const credentials = JSON.stringify({
      client_email: "svc@project.iam.gserviceaccount.com",
      private_key:
        "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
    });

    await makeProvider({
      googleApiKey: undefined,
      googleCredentials: credentials,
      googleProjectId: "my-project",
    }).getAvailableTranslations();

    const config = mockTranslateCtor.mock.calls[0][0];
    expect(config.credentials).toMatchObject({
      client_email: "svc@project.iam.gserviceaccount.com",
    });
    expect(config.projectId).toBe("my-project");
    expect(config.key).toBeUndefined();
  });

  it("throws when neither an API key nor credentials are supplied", () => {
    expect(() => makeProvider({ googleApiKey: undefined })).toThrow(
      /googleApiKey|googleCredentials/,
    );
  });

  it("passes maxRetries through to the Translate client", async () => {
    mockTranslate.mockResolvedValue([["t"]]);
    await makeProvider().translate(["es"], new Map([["k", "v"]]), "f.json", {
      maxRetries: 7,
    });

    expect(mockTranslateCtor.mock.calls[0][0].maxRetries).toBe(7);
  });
});
