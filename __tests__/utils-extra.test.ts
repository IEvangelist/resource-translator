import {
  findNext,
  findValueByKey,
  getLocaleName,
  naturalLanguageCompare,
  delay,
} from "../src/helpers/utils";

describe("getLocaleName", () => {
  it("handles two-segment file names (locale.ext)", () => {
    expect(getLocaleName("/x/en.json", "fr")).toMatch(/fr\.json$/);
  });

  it("handles three-segment file names (name.locale.ext)", () => {
    expect(getLocaleName("/x/Strings.en.resx", "fr")).toMatch(
      /Strings\.fr\.resx$/,
    );
  });

  it("handles four-segment file names (a.b.locale.ext)", () => {
    expect(getLocaleName("/x/My.App.en.resx", "fr")).toMatch(
      /My\.App\.fr\.resx$/,
    );
  });

  it("returns null when the file name does not match a known shape", () => {
    expect(getLocaleName("/x/no-extension", "fr")).toBeNull();
  });
});

describe("naturalLanguageCompare", () => {
  it("returns negative, zero, or positive consistent with localeCompare", () => {
    expect(naturalLanguageCompare("a", "b")).toBeLessThan(0);
    expect(naturalLanguageCompare("a", "a")).toEqual(0);
    expect(naturalLanguageCompare("b", "a")).toBeGreaterThan(0);
  });

  it("returns 0 when either side is empty", () => {
    expect(naturalLanguageCompare("", "a")).toEqual(0);
    expect(naturalLanguageCompare("a", "")).toEqual(0);
  });
});

describe("findValueByKey", () => {
  it("finds a top-level key", () => {
    expect(findValueByKey({ a: 1, b: 2 }, "b")).toEqual(2);
  });

  it("finds a nested key", () => {
    expect(findValueByKey({ a: { b: { c: 7 } } }, "c")).toEqual(7);
  });

  it("returns undefined when missing", () => {
    expect(findValueByKey({ a: 1 }, "missing")).toBeUndefined();
  });
});

describe("findNext", () => {
  it("invokes the action with the next matching item after the predicate hit", () => {
    const items = ["start", "skip", "match"];
    const captured: string[] = [];
    const index = findNext(
      items,
      0,
      (item) => [item === "start", 0],
      (item) => item === "match",
      (item) => captured.push(item),
    );

    expect(index).toEqual(2);
    expect(captured).toEqual(["match"]);
  });

  it("returns -1 for empty input", () => {
    const result = findNext<string>(
      [],
      0,
      () => [false, 0],
      () => false,
      () => undefined,
    );
    expect(result).toEqual(-1);
  });
});

describe("delay", () => {
  it("resolves after the specified time with the given result", async () => {
    const result = await delay(1, "done");
    expect(result).toEqual("done");
  });
});
