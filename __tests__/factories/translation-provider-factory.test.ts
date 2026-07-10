import { translationProviderFactory } from "../../src/factories/translation-provider-factory";
import { Inputs } from "../../src/action/inputs";

jest.mock("@actions/core");

const base = (overrides: Partial<Inputs>): Inputs =>
  ({ sourceLocale: "en", ...overrides }) as Inputs;

describe("translationProviderFactory", () => {
  it("defaults to the Azure provider when provider is unset", () => {
    const provider = translationProviderFactory(
      base({
        provider: undefined,
        endpoint: "https://example.cognitiveservices.azure.com/",
        subscriptionKey: "0123456789abcdef0123456789abcdef",
      }),
    );
    expect(provider.name).toBe("azure");
  });

  it("returns the Azure provider for provider=azure", () => {
    const provider = translationProviderFactory(
      base({
        provider: "azure",
        endpoint: "https://example.cognitiveservices.azure.com/",
        subscriptionKey: "0123456789abcdef0123456789abcdef",
      }),
    );
    expect(provider.name).toBe("azure");
  });

  it("returns the AWS provider for provider=aws", () => {
    const provider = translationProviderFactory(
      base({ provider: "aws", awsRegion: "us-east-1" }),
    );
    expect(provider.name).toBe("aws");
  });

  it("returns the Google provider for provider=google", () => {
    const provider = translationProviderFactory(
      base({ provider: "google", googleApiKey: "test-api-key" }),
    );
    expect(provider.name).toBe("google");
  });
});
