/**
 * Integration test for the `start()` orchestrator in resource-translator.ts.
 *
 * Until now this file had 0% test coverage — every other test focuses on
 * a single parser or helper. This test exercises the end-to-end flow with
 * a real fixture file, mocked Azure responses, and assertions over the
 * actual files written to disk.
 *
 * It also serves as the regression test for the source-tree leakage bug:
 * with the old `Object.assign({}, parsedFile)` clone, the second locale's
 * output would inherit the FIRST locale's translations because `root` was
 * shared by reference. The "no cross-locale leakage" assertion below
 * fails on the buggy version and passes after the per-locale re-parse fix.
 */

import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";

jest.mock("@azure-rest/ai-translation-text", () => ({
  __esModule: true,
  default: jest.fn(),
  isUnexpected: jest.fn(),
}));
jest.mock("@actions/github", () => ({
  context: { repo: { owner: "test", repo: "test" }, ref: "refs/heads/main" },
  getOctokit: jest.fn(() => ({
    rest: { repos: { getCommit: jest.fn().mockResolvedValue({ data: {} }) } },
  })),
}));
jest.mock("@actions/core", () => {
  const actual = jest.requireActual("@actions/core");
  const summaryMock = {
    addRaw: jest.fn().mockReturnThis(),
    addHeading: jest.fn().mockReturnThis(),
    addTable: jest.fn().mockReturnThis(),
    addEOL: jest.fn().mockReturnThis(),
    write: jest.fn().mockResolvedValue(undefined),
  };
  return {
    ...actual,
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    setFailed: jest.fn(),
    setOutput: jest.fn(),
    summary: summaryMock,
  };
});

import createClient, { isUnexpected } from "@azure-rest/ai-translation-text";
import { start } from "../src/resource-translator";
import type { Inputs } from "../src/action/inputs";

const mockedCreateClient = createClient as unknown as jest.Mock;
const mockedIsUnexpected = isUnexpected as unknown as jest.Mock;

describe("start() integration", () => {
  let tmp: string;
  let originalCwd: string;

  beforeEach(() => {
    jest.clearAllMocks();
    originalCwd = process.cwd();
    tmp = mkdtempSync(join(tmpdir(), "rt-it-"));
    process.chdir(tmp);

    // Source fixture: a minimal .resx with two translatable entries.
    mkdirSync(join(tmp, "src"), { recursive: true });
    writeFileSync(
      join(tmp, "src", "Test.en.resx"),
      `<?xml version="1.0" encoding="utf-8"?>
<root>
  <data name="Hello"><value>Hello</value></data>
  <data name="World"><value>World</value></data>
</root>
`,
      "utf-8",
    );

    // Default discriminator: any 2xx is "expected". Both endpoints below
    // return 200, so this default is enough for the happy path tests.
    mockedIsUnexpected.mockImplementation((response: { status: string }) => {
      const status = String(response?.status ?? "200");
      return !status.startsWith("2");
    });

    // 1) GET /languages – Translator language catalogue. Restrict the set
    //    to fr+es so the orchestrator only attempts those two locales.
    const languagesGet = jest.fn().mockResolvedValue({
      status: "200",
      body: { translation: { fr: {}, es: {} } },
    });

    // 2) POST /translate – return locale-specific text per call. Our flow
    //    sends each text item once with all target locales requested, so
    //    each response contains a translations array per item.
    const translatePost = jest
      .fn()
      .mockImplementation(
        async ({ body }: { body: { inputs: Array<{ text: string }> } }) => {
          const responseBody = body.inputs.map((item) => ({
            translations: [
              { to: "fr", text: `FR:${item.text}` },
              { to: "es", text: `ES:${item.text}` },
            ],
          }));
          return { status: "200", body: responseBody };
        },
      );

    mockedCreateClient.mockImplementation(() => ({
      path: (path: string) => {
        if (path === "/languages") return { get: languagesGet };
        if (path === "/translate") return { post: translatePost };
        throw new Error(`Unexpected path: ${path}`);
      },
    }));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  const baseInputs: Inputs = {
    subscriptionKey: "k",
    endpoint: "https://api.cognitive.microsofttranslator.com/",
    sourceLocale: "en",
    toLocales: ["fr", "es"],
    apiVersion: "3.0",
    failOnError: false,
  };

  it("writes per-locale files with NO cross-locale translation leakage", async () => {
    await start(baseInputs);

    const fr = readFileSync(join(tmp, "src", "Test.fr.resx"), "utf-8");
    const es = readFileSync(join(tmp, "src", "Test.es.resx"), "utf-8");

    // FR file contains FR translations and NOT ES translations.
    expect(fr).toContain("FR:Hello");
    expect(fr).toContain("FR:World");
    expect(fr).not.toContain("ES:");

    // ES file contains ES translations and NOT FR translations. This is
    // the regression assertion: with the old shallow-clone the FR mutation
    // leaked into the source tree, so ES output ended up containing
    // "FR:Hello"/"FR:World" instead of its own ES translations.
    expect(es).toContain("ES:Hello");
    expect(es).toContain("ES:World");
    expect(es).not.toContain("FR:");
  });

  it("dryRun=true does not write any output files", async () => {
    await start({ ...baseInputs, dryRun: true });

    expect(() => readFileSync(join(tmp, "src", "Test.fr.resx"))).toThrow();
    expect(() => readFileSync(join(tmp, "src", "Test.es.resx"))).toThrow();
  });
});
