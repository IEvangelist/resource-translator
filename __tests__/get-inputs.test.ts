import { InputOptions } from "@actions/core";
import { getInputs, getQuestionableArray } from "../src/action/get-inputs";

const inputValues: Record<string, string> = {
  stringValue: "es,de,fr",
  arrayValue: '[ "es", "de", "fr" ]',
};

jest.mock("@actions/core", () => {
  const actual =
    jest.requireActual<typeof import("@actions/core")>("@actions/core");
  return {
    ...actual,
    getInput: (name: string, _options?: InputOptions) =>
      inputValues[name] ?? "",
    getBooleanInput: (name: string) => {
      const raw = inputValues[name];
      if (raw === undefined || raw === "") {
        throw new Error(`Input ${name} not supplied`);
      }
      return ["true", "True", "TRUE"].includes(raw);
    },
  };
});

const setInput = (name: string, value: string) => {
  inputValues[name] = value;
};

const clearInputs = () => {
  for (const key of Object.keys(inputValues)) {
    delete inputValues[key];
  }
};

describe("getQuestionableArray", () => {
  beforeEach(() => {
    clearInputs();
    setInput("stringValue", "es,de,fr");
    setInput("arrayValue", '[ "es", "de", "fr" ]');
  });

  it("returns undefined when the input is missing or empty", () => {
    expect(getQuestionableArray("")).toBeFalsy();
  });

  it("parses comma-separated values", () => {
    expect(getQuestionableArray("stringValue")).toEqual(["es", "de", "fr"]);
  });

  it("parses JSON array input", () => {
    expect(getQuestionableArray("arrayValue")).toEqual(["es", "de", "fr"]);
  });

  it("trims whitespace inside comma-separated values", () => {
    setInput("padded", "  es ,  de , fr  ");
    expect(getQuestionableArray("padded")).toEqual(["es", "de", "fr"]);
  });
});

describe("getInputs", () => {
  beforeEach(() => {
    clearInputs();
    setInput("subscriptionKey", "0123456789abcdef0123456789abcdef");
    setInput("endpoint", "https://example.cognitiveservices.azure.com/");
    setInput("sourceLocale", "en");
    setInput("region", "eastus");
    setInput("toLocales", '["fr","de"]');
    setInput("failOnError", "true");
    setInput("dryRun", "false");
    // Use a non-existent config path so the loader is a no-op.
    setInput("configPath", "non-existent-config-path.yml");
  });

  it("returns the populated Inputs shape", () => {
    const inputs = getInputs();
    expect(inputs.subscriptionKey).toEqual("0123456789abcdef0123456789abcdef");
    expect(inputs.endpoint).toEqual(
      "https://example.cognitiveservices.azure.com/",
    );
    expect(inputs.sourceLocale).toEqual("en");
    expect(inputs.region).toEqual("eastus");
    expect(inputs.toLocales).toEqual(["fr", "de"]);
    expect(inputs.dryRun).toEqual(false);
    expect(inputs.failOnError).toEqual(true);
  });

  it("treats toLocales as optional", () => {
    delete inputValues["toLocales"];
    const inputs = getInputs();
    expect(inputs.toLocales).toBeUndefined();
  });

  it("treats region as optional (empty string normalized to '')", () => {
    delete inputValues["region"];
    const inputs = getInputs();
    expect(inputs.region).toEqual("");
  });

  it("rejects an invalid endpoint", () => {
    setInput("endpoint", "not-a-url");
    expect(() => getInputs()).toThrow(/endpoint/);
  });

  it("rejects a too-short subscription key", () => {
    setInput("subscriptionKey", "tooshort");
    expect(() => getInputs()).toThrow(/subscriptionKey/);
  });

  it("reads textType, profanityAction, profanityMarker, and allowFallback inputs", () => {
    setInput("textType", "html");
    setInput("profanityAction", "Marked");
    setInput("profanityMarker", "Tag");
    setInput("allowFallback", "false");
    const inputs = getInputs();
    expect(inputs.textType).toEqual("html");
    expect(inputs.profanityAction).toEqual("Marked");
    expect(inputs.profanityMarker).toEqual("Tag");
    expect(inputs.allowFallback).toEqual(false);
  });

  it("returns undefined for allowFallback when not provided", () => {
    const inputs = getInputs();
    expect(inputs.allowFallback).toBeUndefined();
  });

  it("rejects an invalid textType", () => {
    setInput("textType", "markdown");
    expect(() => getInputs()).toThrow(/textType/);
  });

  it("rejects an invalid profanityAction", () => {
    setInput("profanityAction", "Mask");
    expect(() => getInputs()).toThrow(/profanityAction/);
  });

  it("rejects profanityMarker without profanityAction='Marked'", () => {
    setInput("profanityAction", "Deleted");
    setInput("profanityMarker", "Tag");
    expect(() => getInputs()).toThrow(/profanityMarker/);
  });

  it("reads noTranslatePatterns as a multiline list", () => {
    setInput(
      "noTranslatePatterns",
      "errors.code.*\nbrands.*\n\n  whitespace-only-lines-skipped  ",
    );
    const inputs = getInputs();
    expect(inputs.noTranslatePatterns).toEqual([
      "errors.code.*",
      "brands.*",
      "whitespace-only-lines-skipped",
    ]);
  });

  it("returns undefined for noTranslatePatterns when not provided", () => {
    const inputs = getInputs();
    expect(inputs.noTranslatePatterns).toBeUndefined();
  });

  it("reads protectPlaceholders as a tri-state boolean", () => {
    setInput("protectPlaceholders", "false");
    expect(getInputs().protectPlaceholders).toBe(false);
    setInput("protectPlaceholders", "true");
    expect(getInputs().protectPlaceholders).toBe(true);
    delete inputValues["protectPlaceholders"];
    expect(getInputs().protectPlaceholders).toBeUndefined();
  });

  it("reads customPlaceholderPatterns as a multiline list", () => {
    setInput("customPlaceholderPatterns", "<<.+?>>\n\\$brand\\$");
    expect(getInputs().customPlaceholderPatterns).toEqual([
      "<<.+?>>",
      "\\$brand\\$",
    ]);
  });

  it("parses maxRetries and retryBackoffMs as non-negative integers", () => {
    setInput("maxRetries", "8");
    setInput("retryBackoffMs", "60000");
    const inputs = getInputs();
    expect(inputs.maxRetries).toBe(8);
    expect(inputs.retryBackoffMs).toBe(60000);
  });

  it("rejects a non-numeric maxRetries", () => {
    setInput("maxRetries", "lots");
    expect(() => getInputs()).toThrow(/maxRetries/);
  });

  it("rejects a negative retryBackoffMs", () => {
    setInput("retryBackoffMs", "-5");
    expect(() => getInputs()).toThrow(/retryBackoffMs/);
  });

  it("defaults provider to azure when unset", () => {
    expect(getInputs().provider).toEqual("azure");
  });
});

describe("getInputs provider validation", () => {
  const savedRegion = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION,
  };

  beforeEach(() => {
    clearInputs();
    setInput("sourceLocale", "en");
    setInput("toLocales", '["fr","de"]');
    setInput("configPath", "non-existent-config-path.yml");
    // Isolate AWS region resolution from the host environment.
    delete process.env.AWS_REGION;
    delete process.env.AWS_DEFAULT_REGION;
  });

  afterAll(() => {
    if (savedRegion.AWS_REGION) process.env.AWS_REGION = savedRegion.AWS_REGION;
    if (savedRegion.AWS_DEFAULT_REGION)
      process.env.AWS_DEFAULT_REGION = savedRegion.AWS_DEFAULT_REGION;
  });

  it("rejects an unknown provider value", () => {
    setInput("provider", "ibm");
    expect(() => getInputs()).toThrow(/provider/);
  });

  it("does not require Azure credentials when provider is aws", () => {
    setInput("provider", "aws");
    setInput("awsRegion", "us-east-1");
    const inputs = getInputs();
    expect(inputs.provider).toEqual("aws");
    expect(inputs.awsRegion).toEqual("us-east-1");
  });

  it("requires a region for provider=aws", () => {
    setInput("provider", "aws");
    expect(() => getInputs()).toThrow(/awsRegion|AWS_REGION/);
  });

  it("accepts AWS_REGION from the environment for provider=aws", () => {
    setInput("provider", "aws");
    process.env.AWS_REGION = "eu-west-1";
    expect(() => getInputs()).not.toThrow();
  });

  it("rejects a lone AWS access key id without its secret", () => {
    setInput("provider", "aws");
    setInput("awsRegion", "us-east-1");
    setInput("awsAccessKeyId", "AKIAEXAMPLE0000000000");
    expect(() => getInputs()).toThrow(/awsSecretAccessKey|together/);
  });

  it("requires an API key or credentials for provider=google", () => {
    setInput("provider", "google");
    expect(() => getInputs()).toThrow(/googleApiKey|googleCredentials/);
  });

  it("accepts an API key for provider=google", () => {
    setInput("provider", "google");
    setInput("googleApiKey", "test-api-key");
    const inputs = getInputs();
    expect(inputs.provider).toEqual("google");
    expect(inputs.googleApiKey).toEqual("test-api-key");
  });

  it("rejects malformed googleCredentials JSON", () => {
    setInput("provider", "google");
    setInput("googleCredentials", "{ not valid json");
    expect(() => getInputs()).toThrow(/googleCredentials/);
  });
});
