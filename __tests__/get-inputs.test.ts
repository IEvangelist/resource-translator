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
});
