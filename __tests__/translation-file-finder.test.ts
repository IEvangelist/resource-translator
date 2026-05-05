jest.mock("@actions/github", () => ({
  context: { repo: { owner: "test", repo: "test" }, ref: "refs/heads/main" },
  getOctokit: jest.fn(() => ({
    rest: { repos: { getCommit: jest.fn().mockResolvedValue({ data: {} }) } },
  })),
}));

import { resolve } from "path";
import { findAllTranslationFiles } from "../src/io/translation-file-finder";

jest.setTimeout(60000);

describe("findAllTranslationFiles", () => {
  const originalCwd = process.cwd();
  const originalToken = process.env["GITHUB_TOKEN"];

  beforeAll(() => {
    process.chdir(resolve(__dirname, "data"));
    delete process.env["GITHUB_TOKEN"];
  });

  afterAll(() => {
    process.chdir(originalCwd);
    if (originalToken !== undefined) {
      process.env["GITHUB_TOKEN"] = originalToken;
    }
  });

  it("discovers fixtures by source-locale pattern (en)", async () => {
    const files = await findAllTranslationFiles("en");

    expect(files).toBeTruthy();
    // We have *.en.resx, *.en.restext, *.en.ini, *.en.json, en.po fixtures.
    expect(files.resx?.some((f) => f.endsWith(".en.resx"))).toBeTruthy();
    expect(files.restext?.some((f) => f.endsWith(".en.restext"))).toBeTruthy();
    expect(files.ini?.some((f) => f.endsWith(".en.ini"))).toBeTruthy();
    expect(files.json?.some((f) => f.endsWith(".en.json"))).toBeTruthy();
    // .po discovery is now locale-aware: en.po matches; fr.po / cs.po do NOT.
    expect(files.po?.some((f) => /[\\/]en\.po$/.test(f))).toBeTruthy();
    expect(files.po?.some((f) => /[\\/]fr\.po$/.test(f))).toBe(false);
    expect(files.po?.some((f) => /[\\/]cs\.po$/.test(f))).toBe(false);
  });

  it("returns empty arrays for unknown source locale", async () => {
    const files = await findAllTranslationFiles("zz");

    expect(files.resx?.length ?? 0).toEqual(0);
    expect(files.restext?.length ?? 0).toEqual(0);
    expect(files.ini?.length ?? 0).toEqual(0);
    expect(files.json?.length ?? 0).toEqual(0);
    // PO discovery is locale-scoped — there's no zz.po fixture, so 0 matches.
    // Regression test: previously `**/*.po` was locale-agnostic and picked
    // up the existing target-locale files (fr.po, cs.po) as if they were
    // source inputs.
    expect(files.po?.length ?? 0).toEqual(0);
  });

  it("matches xliff for jp locale fixture", async () => {
    const files = await findAllTranslationFiles("jp");
    expect(files.xliff?.some((f) => f.endsWith(".jp.xliff"))).toBeTruthy();
  });

  it("discovers gettext-layout PO files at <locale>/LC_MESSAGES/*.po", async () => {
    // Standard gettext directory convention puts each locale's catalog at
    // `<locale>/LC_MESSAGES/<domain>.po`. Make sure our PO discovery matches
    // that layout in addition to the flat `<locale>.po` and
    // `<basename>.<locale>.po` patterns.
    const files = await findAllTranslationFiles("en");
    expect(
      files.po?.some((f) =>
        /[\\/]en[\\/]LC_MESSAGES[\\/]messages\.po$/.test(f),
      ),
    ).toBeTruthy();
  });
});
