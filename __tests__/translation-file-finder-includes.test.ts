jest.mock("@actions/github", () => ({
  context: { repo: { owner: "test", repo: "test" }, ref: "refs/heads/main" },
  getOctokit: jest.fn(() => ({
    rest: { repos: { getCommit: jest.fn().mockResolvedValue({ data: {} }) } },
  })),
}));

import { resolve } from "path";
import { findAllTranslationFiles } from "../src/io/translation-file-finder";

jest.setTimeout(60000);

describe("findAllTranslationFiles include/exclude", () => {
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

  it("filters out files matching `exclude` patterns", async () => {
    const files = await findAllTranslationFiles("en", {
      exclude: ["**/Test.en.resx"],
    });
    expect(files.resx?.some((p) => p.endsWith("Test.en.resx"))).toBeFalsy();
    // Sample.en.resx and Index.en.resx must remain.
    expect(files.resx?.some((p) => p.endsWith("Sample.en.resx"))).toBeTruthy();
    expect(files.resx?.some((p) => p.endsWith("Index.en.resx"))).toBeTruthy();
  });

  it("only matches files in `include` patterns when supplied", async () => {
    const files = await findAllTranslationFiles("en", {
      include: ["**/Settings.en.json"],
    });
    expect(files.json?.length).toEqual(1);
    expect(files.json?.[0].endsWith("Settings.en.json")).toBeTruthy();
    expect(files.resx?.length).toEqual(0);
  });
});
