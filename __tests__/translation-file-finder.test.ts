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
    // We have *.en.resx, *.en.restext, *.en.ini, *.en.json fixtures.
    expect(files.resx?.some((f) => f.endsWith(".en.resx"))).toBeTruthy();
    expect(files.restext?.some((f) => f.endsWith(".en.restext"))).toBeTruthy();
    expect(files.ini?.some((f) => f.endsWith(".en.ini"))).toBeTruthy();
    expect(files.json?.some((f) => f.endsWith(".en.json"))).toBeTruthy();
    // .po files match regardless of locale
    expect(files.po?.length).toBeGreaterThan(0);
  });

  it("returns empty arrays for unknown source locale (po always matches)", async () => {
    const files = await findAllTranslationFiles("zz");

    expect(files.resx?.length ?? 0).toEqual(0);
    expect(files.restext?.length ?? 0).toEqual(0);
    expect(files.ini?.length ?? 0).toEqual(0);
    expect(files.json?.length ?? 0).toEqual(0);
    // .po pattern is locale-agnostic, so it still returns matches.
    expect(files.po?.length).toBeGreaterThan(0);
  });

  it("matches xliff for jp locale fixture", async () => {
    const files = await findAllTranslationFiles("jp");
    expect(files.xliff?.some((f) => f.endsWith(".jp.xliff"))).toBeTruthy();
  });
});

