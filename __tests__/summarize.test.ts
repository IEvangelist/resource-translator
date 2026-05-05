import { Summary } from "../src/abstractions/summary";
import { summarize } from "../src/helpers/summarizer";

describe("summarize", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "IEvangelist/resource-translator",
      GITHUB_SHA: "abcdef1234567890",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("includes counts, locales, and triggering commit URL", () => {
    const summary = new Summary("en", ["fr", "de", "es"]);
    summary.newFileCount = 2;
    summary.newFileTranslations = 12;
    summary.updatedFileCount = 3;
    summary.updatedFileTranslations = 18;

    const [title, details] = summarize(summary);

    expect(title).toContain("Machine-translated 5 files");
    expect(title).toContain("30 translations");
    expect(details).toContain(
      "https://github.com/IEvangelist/resource-translator/commit/abcdef1234567890",
    );
    expect(details).toContain("`en`");
    expect(details).toContain("`fr`");
    expect(details).toContain("| New     | 2     | 12            |");
    expect(details).toContain("| Updated | 3     | 18            |");
  });

  it("formats large numbers with thousands separators", () => {
    const summary = new Summary("en", ["fr"]);
    summary.newFileCount = 1234;
    summary.newFileTranslations = 56789;
    summary.updatedFileCount = 0;
    summary.updatedFileTranslations = 0;

    const [title, details] = summarize(summary);

    expect(title).toContain("Machine-translated 1,234 files");
    expect(title).toContain("56,789 translations");
    expect(details).toContain("1,234");
    expect(details).toContain("56,789");
  });
});
