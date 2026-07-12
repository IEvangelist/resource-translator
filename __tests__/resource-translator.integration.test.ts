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
import {
  buildTranslationFingerprint,
  getTranslationLocaleState,
  hashText,
  normalizeStatePath,
  replaceTranslationLocaleState,
  TRANSLATION_STATE_SCHEMA_VERSION,
  TranslationState,
} from "../src/helpers/translation-state";

const mockedCreateClient = createClient as unknown as jest.Mock;
const mockedIsUnexpected = isUnexpected as unknown as jest.Mock;

describe("start() integration", () => {
  let tmp: string;
  let originalCwd: string;
  let translatePost: jest.Mock;

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
    translatePost = jest
      .fn()
      .mockImplementation(
        async ({ body }: { body: Array<{ text: string }> }) => {
          const responseBody = body.map((item) => ({
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

  it("translates only changed keys and preserves manual target edits", async () => {
    const sourcePath = join(tmp, "src", "Test.en.resx");
    const targetPath = join(tmp, "src", "Test.fr.resx");
    writeFileSync(
      sourcePath,
      `<?xml version="1.0" encoding="utf-8"?>
<root>
  <data name="Hello"><value>Hello updated</value></data>
  <data name="World"><value>World</value></data>
</root>
`,
      "utf-8",
    );
    writeFileSync(
      targetPath,
      `<?xml version="1.0" encoding="utf-8"?>
<root>
  <data name="Hello"><value>FR:Hello</value></data>
  <data name="World"><value>Manual world</value></data>
</root>
`,
      "utf-8",
    );

    const inputs = { ...baseInputs, toLocales: ["fr"] };
    writeState(inputs, sourcePath, targetPath, {
      Hello: {
        sourceHash: hashText("Hello"),
        targetHash: hashText("FR:Hello"),
      },
      World: {
        sourceHash: hashText("World"),
        targetHash: hashText("FR:World"),
      },
    });

    await start(inputs);

    expect(translatePost).toHaveBeenCalledTimes(1);
    expect(translatePost.mock.calls[0][0].body).toEqual([
      { text: "Hello updated" },
    ]);

    const fr = readFileSync(targetPath, "utf-8");
    expect(fr).toContain("FR:Hello updated");
    expect(fr).toContain("Manual world");

    const state = readState();
    const entry = getTranslationLocaleState(
      state,
      normalizeStatePath(sourcePath),
      "fr",
    )!.keys.World;
    expect(entry.targetHash).toBe(hashText("Manual world"));
  });

  it("does not call the provider when all keys are unchanged", async () => {
    const sourcePath = join(tmp, "src", "Test.en.resx");
    const targetPath = join(tmp, "src", "Test.fr.resx");
    writeFileSync(
      targetPath,
      `<?xml version="1.0" encoding="utf-8"?>
<root>
  <data name="Hello"><value>FR:Hello</value></data>
  <data name="World"><value>FR:World</value></data>
</root>
`,
      "utf-8",
    );

    const inputs = { ...baseInputs, toLocales: ["fr"] };
    writeState(inputs, sourcePath, targetPath, {
      Hello: {
        sourceHash: hashText("Hello"),
        targetHash: hashText("FR:Hello"),
      },
      World: {
        sourceHash: hashText("World"),
        targetHash: hashText("FR:World"),
      },
    });

    await start(inputs);

    expect(translatePost).not.toHaveBeenCalled();
  });

  it("snapshotOnly bootstraps state from existing targets without provider calls", async () => {
    const sourcePath = join(tmp, "src", "Test.en.resx");
    const targetPath = join(tmp, "src", "Test.fr.resx");
    writeFileSync(
      targetPath,
      `<?xml version="1.0" encoding="utf-8"?>
<root>
  <data name="Hello"><value>Bonjour</value></data>
  <data name="World"><value>Monde</value></data>
</root>
`,
      "utf-8",
    );

    await start({
      provider: "azure",
      sourceLocale: "en",
      snapshotOnly: true,
      failOnError: false,
    });

    expect(mockedCreateClient).not.toHaveBeenCalled();
    expect(translatePost).not.toHaveBeenCalled();

    const state = readState();
    const localeState = getTranslationLocaleState(
      state,
      normalizeStatePath(sourcePath),
      "fr",
    )!;
    expect(localeState.targetPath).toBe(normalizeStatePath(targetPath));
    expect(localeState.keys.Hello.sourceHash).toBe(hashText("Hello"));
    expect(localeState.keys.Hello.targetHash).toBe(hashText("Bonjour"));
    expect(localeState.keys.World.sourceHash).toBe(hashText("World"));
    expect(localeState.keys.World.targetHash).toBe(hashText("Monde"));
  });

  const writeState = (
    inputs: Inputs,
    sourcePath: string,
    targetPath: string,
    keys: Record<string, { sourceHash: string; targetHash: string }>,
  ) => {
    mkdirSync(join(tmp, ".github"), { recursive: true });
    const fingerprint = buildTranslationFingerprint(inputs, "azure", "fr");
    const sourceStatePath = normalizeStatePath(sourcePath);
    const targetStatePath = normalizeStatePath(targetPath);
    const state: TranslationState = {
      schemaVersion: TRANSLATION_STATE_SCHEMA_VERSION,
      files: {},
    };
    replaceTranslationLocaleState(
      state,
      sourceStatePath,
      "resx",
      "fr",
      targetStatePath,
      Object.fromEntries(
        Object.entries(keys).map(([key, value]) => [
          key,
          {
            ...value,
            fingerprint,
          },
        ]),
      ),
    );
    writeFileSync(
      join(tmp, ".github", "resource-translator-state.json"),
      JSON.stringify(state, null, 2),
      "utf-8",
    );
  };

  const readState = (): TranslationState =>
    JSON.parse(
      readFileSync(
        join(tmp, ".github", "resource-translator-state.json"),
        "utf-8",
      ),
    ) as TranslationState;
});
