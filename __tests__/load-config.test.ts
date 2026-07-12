import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadRepoConfig,
  mergeInputsAndConfig,
} from "../src/action/load-config";
import { Inputs } from "../src/action/inputs";

jest.mock("@actions/core", () => ({
  debug: jest.fn(),
  warning: jest.fn(),
}));

describe("loadRepoConfig", () => {
  let tempWorkspace: string;
  const originalWorkspace = process.env["GITHUB_WORKSPACE"];

  beforeEach(() => {
    tempWorkspace = mkdtempSync(join(tmpdir(), "rt-config-"));
    process.env["GITHUB_WORKSPACE"] = tempWorkspace;
  });

  afterEach(() => {
    rmSync(tempWorkspace, { recursive: true, force: true });
    if (originalWorkspace === undefined) {
      delete process.env["GITHUB_WORKSPACE"];
    } else {
      process.env["GITHUB_WORKSPACE"] = originalWorkspace;
    }
  });

  it("returns an empty config when the file does not exist", () => {
    expect(loadRepoConfig()).toEqual({});
  });

  it("returns an empty config when the YAML is malformed", () => {
    mkdirSync(join(tempWorkspace, ".github"), { recursive: true });
    writeFileSync(
      join(tempWorkspace, ".github", "resource-translator.yml"),
      "::: not yaml :::",
      "utf-8",
    );
    expect(loadRepoConfig()).toEqual({});
  });

  it("parses a complete config from the default path", () => {
    mkdirSync(join(tempWorkspace, ".github"), { recursive: true });
    writeFileSync(
      join(tempWorkspace, ".github", "resource-translator.yml"),
      [
        "sourceLocale: en",
        "toLocales:",
        "  - fr",
        "  - de",
        "include:",
        "  - src/**/*.json",
        "exclude:",
        "  - vendor/**",
        "glossary:",
        "  Acme: Contoso",
        "categoryId: my-category",
        "apiVersion: '3.0'",
      ].join("\n"),
      "utf-8",
    );

    const config = loadRepoConfig();
    expect(config.sourceLocale).toEqual("en");
    expect(config.toLocales).toEqual(["fr", "de"]);
    expect(config.include).toEqual(["src/**/*.json"]);
    expect(config.exclude).toEqual(["vendor/**"]);
    expect(config.glossary).toEqual({ Acme: "Contoso" });
    expect(config.categoryId).toEqual("my-category");
    expect(config.apiVersion).toEqual("3.0");
  });

  it("supports comma-separated string lists for include/exclude/toLocales", () => {
    mkdirSync(join(tempWorkspace, "subdir"), { recursive: true });
    const path = join(tempWorkspace, "subdir", "custom.yml");
    writeFileSync(
      path,
      ["toLocales: fr,de,es", "include: 'src/**'"].join("\n"),
      "utf-8",
    );

    const config = loadRepoConfig("subdir/custom.yml");
    expect(config.toLocales).toEqual(["fr", "de", "es"]);
    expect(config.include).toEqual(["src/**"]);
  });

  it("parses textType, profanityAction, profanityMarker, and allowFallback", () => {
    mkdirSync(join(tempWorkspace, ".github"), { recursive: true });
    writeFileSync(
      join(tempWorkspace, ".github", "resource-translator.yml"),
      [
        "textType: html",
        "profanityAction: Marked",
        "profanityMarker: Tag",
        "allowFallback: false",
      ].join("\n"),
      "utf-8",
    );

    const config = loadRepoConfig();
    expect(config.textType).toEqual("html");
    expect(config.profanityAction).toEqual("Marked");
    expect(config.profanityMarker).toEqual("Tag");
    expect(config.allowFallback).toEqual(false);
  });

  it("parses smart change detection settings", () => {
    mkdirSync(join(tempWorkspace, ".github"), { recursive: true });
    writeFileSync(
      join(tempWorkspace, ".github", "resource-translator.yml"),
      [
        "changeDetection: false",
        "statePath: .github/custom-translation-state.json",
      ].join("\n"),
      "utf-8",
    );

    const config = loadRepoConfig();
    expect(config.changeDetection).toEqual("disabled");
    expect(config.statePath).toEqual(".github/custom-translation-state.json");
  });

  it("parses nested Azure provider config", () => {
    mkdirSync(join(tempWorkspace, ".github"), { recursive: true });
    writeFileSync(
      join(tempWorkspace, ".github", "resource-translator.yml"),
      [
        "provider:",
        "  azure:",
        "    subscriptionKey: 0123456789abcdef0123456789abcdef",
        "    endpoint: https://example.cognitiveservices.azure.com/",
        "    region: eastus",
        "    categoryId: custom-category",
        "    apiVersion: '3.0'",
        "    allowFallback: false",
      ].join("\n"),
      "utf-8",
    );

    const config = loadRepoConfig();
    expect(config.provider).toEqual("azure");
    expect(config.subscriptionKey).toEqual("0123456789abcdef0123456789abcdef");
    expect(config.endpoint).toEqual(
      "https://example.cognitiveservices.azure.com/",
    );
    expect(config.region).toEqual("eastus");
    expect(config.categoryId).toEqual("custom-category");
    expect(config.apiVersion).toEqual("3.0");
    expect(config.allowFallback).toEqual(false);
  });

  it("parses nested AWS provider behavior config", () => {
    mkdirSync(join(tempWorkspace, ".github"), { recursive: true });
    writeFileSync(
      join(tempWorkspace, ".github", "resource-translator.yml"),
      [
        "provider:",
        "  aws:",
        "    region: us-east-1",
        "    formality: informal",
        "    brevity: true",
        "    terminologyNames: term-one,term-two",
        "    parallelDataNames:",
        "      - parallel-one",
      ].join("\n"),
      "utf-8",
    );

    const config = loadRepoConfig();
    expect(config.provider).toEqual("aws");
    expect(config.awsRegion).toEqual("us-east-1");
    expect(config.awsFormality).toEqual("INFORMAL");
    expect(config.awsBrevity).toEqual(true);
    expect(config.awsTerminologyNames).toEqual(["term-one", "term-two"]);
    expect(config.awsParallelDataNames).toEqual(["parallel-one"]);
  });

  it("parses nested Google provider behavior config", () => {
    mkdirSync(join(tempWorkspace, ".github"), { recursive: true });
    writeFileSync(
      join(tempWorkspace, ".github", "resource-translator.yml"),
      [
        "provider:",
        "  google:",
        "    apiKey: test-api-key",
        "    projectId: project-one",
        "    model: nmt",
        "    apiEndpoint: private.googleapis.com",
        "    autoRetry: false",
      ].join("\n"),
      "utf-8",
    );

    const config = loadRepoConfig();
    expect(config.provider).toEqual("google");
    expect(config.googleApiKey).toEqual("test-api-key");
    expect(config.googleProjectId).toEqual("project-one");
    expect(config.googleModel).toEqual("nmt");
    expect(config.googleApiEndpoint).toEqual("private.googleapis.com");
    expect(config.googleAutoRetry).toEqual(false);
  });

  it("drops invalid enum values silently from YAML", () => {
    mkdirSync(join(tempWorkspace, ".github"), { recursive: true });
    writeFileSync(
      join(tempWorkspace, ".github", "resource-translator.yml"),
      ["textType: markdown", "profanityAction: Mask"].join("\n"),
      "utf-8",
    );

    const config = loadRepoConfig();
    expect(config.textType).toBeUndefined();
    expect(config.profanityAction).toBeUndefined();
  });
});

describe("mergeInputsAndConfig", () => {
  const baseInputs: Inputs = {
    subscriptionKey: "0123456789abcdef0123456789abcdef",
    endpoint: "https://example.cognitiveservices.azure.com/",
    sourceLocale: "en",
  };

  it("uses repo-config values when input values are missing", () => {
    const merged = mergeInputsAndConfig(baseInputs, {
      toLocales: ["fr"],
      include: ["src/**"],
      glossary: { Acme: "Contoso" },
      apiVersion: "3.0",
    });
    expect(merged.toLocales).toEqual(["fr"]);
    expect(merged.include).toEqual(["src/**"]);
    expect(merged.glossary).toEqual({ Acme: "Contoso" });
    expect(merged.apiVersion).toEqual("3.0");
  });

  it("prefers explicit input values over repo-config", () => {
    const merged = mergeInputsAndConfig(
      { ...baseInputs, toLocales: ["es"], categoryId: "input-category" },
      { toLocales: ["fr"], categoryId: "config-category" },
    );
    expect(merged.toLocales).toEqual(["es"]);
    expect(merged.categoryId).toEqual("input-category");
  });

  it("treats empty arrays/strings as missing for merge purposes", () => {
    const merged = mergeInputsAndConfig(
      { ...baseInputs, toLocales: [], categoryId: "" },
      { toLocales: ["fr"], categoryId: "from-config" },
    );
    expect(merged.toLocales).toEqual(["fr"]);
    expect(merged.categoryId).toEqual("from-config");
  });

  it("preserves explicit boolean false from inputs over a config value", () => {
    const merged = mergeInputsAndConfig(
      { ...baseInputs, allowFallback: false },
      { allowFallback: true },
    );
    // false is meaningful — must not fall through to the YAML default.
    expect(merged.allowFallback).toEqual(false);
  });

  it("falls back to YAML allowFallback when the input is undefined", () => {
    const merged = mergeInputsAndConfig(baseInputs, { allowFallback: false });
    expect(merged.allowFallback).toEqual(false);
  });

  it("merges textType, profanityAction, profanityMarker from YAML", () => {
    const merged = mergeInputsAndConfig(baseInputs, {
      textType: "html",
      profanityAction: "Marked",
      profanityMarker: "Tag",
    });
    expect(merged.textType).toEqual("html");
    expect(merged.profanityAction).toEqual("Marked");
    expect(merged.profanityMarker).toEqual("Tag");
  });

  it("merges smart change detection settings from YAML", () => {
    const merged = mergeInputsAndConfig(baseInputs, {
      changeDetection: "disabled",
      statePath: ".github/custom-state.json",
    });
    expect(merged.changeDetection).toEqual("disabled");
    expect(merged.statePath).toEqual(".github/custom-state.json");
  });

  it("merges provider credentials and behavior from YAML", () => {
    const merged = mergeInputsAndConfig(
      { sourceLocale: "en", configPath: "custom.yml" } as Inputs,
      {
        provider: "aws",
        awsRegion: "us-east-1",
        awsFormality: "FORMAL",
        awsBrevity: true,
        awsTerminologyNames: ["terms"],
      },
    );
    expect(merged.provider).toEqual("aws");
    expect(merged.awsRegion).toEqual("us-east-1");
    expect(merged.awsFormality).toEqual("FORMAL");
    expect(merged.awsBrevity).toEqual(true);
    expect(merged.awsTerminologyNames).toEqual(["terms"]);
  });
});
