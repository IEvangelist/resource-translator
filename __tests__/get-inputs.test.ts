import { InputOptions } from "@actions/core";
import { getInputs, getQuestionableArray } from "../src/action/get-inputs";

const inputValues: Record<string, string> = {
  stringValue: "es,de,fr",
  arrayValue: '[ "es", "de", "fr" ]',
};

jest.mock("@actions/core", () => ({
  getInput: (name: string, _options?: InputOptions) => inputValues[name] ?? "",
}));

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
    setInput("subscriptionKey", "sk-123");
    setInput("endpoint", "https://example.cognitiveservices.azure.com/");
    setInput("sourceLocale", "en");
    setInput("region", "eastus");
    setInput("toLocales", '["fr","de"]');
  });

  it("returns the populated Inputs shape", () => {
    const inputs = getInputs();
    expect(inputs).toEqual({
      subscriptionKey: "sk-123",
      endpoint: "https://example.cognitiveservices.azure.com/",
      sourceLocale: "en",
      region: "eastus",
      toLocales: ["fr", "de"],
    });
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
});

