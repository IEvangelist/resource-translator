import { protect, restore } from "../../src/helpers/placeholders";

describe("placeholders.protect/restore", () => {
  it("round-trips an i18next {{name}} placeholder", () => {
    const { protected: p, tokens } = protect("Hello {{name}}!");
    expect(p).not.toContain("{{name}}");
    expect(tokens.size).toBe(1);
    expect(restore(p, tokens)).toBe("Hello {{name}}!");
  });

  it("round-trips multiple i18next placeholders in one string", () => {
    const src = "Welcome {{user}}, you have {{count}} messages.";
    const { protected: p, tokens } = protect(src);
    expect(tokens.size).toBe(2);
    expect(p).not.toMatch(/\{\{/);
    expect(restore(p, tokens)).toBe(src);
  });

  it("round-trips ES template ${var} placeholders", () => {
    const src = "Path: ${cwd}/file.txt";
    const { protected: p, tokens } = protect(src);
    expect(tokens.size).toBe(1);
    expect(restore(p, tokens)).toBe(src);
  });

  it("round-trips .NET composite formatting {0}, {0:N2}, and named slots", () => {
    const src = "{0} of {1:N2} (user={name})";
    const { protected: p, tokens } = protect(src);
    expect(tokens.size).toBe(3);
    expect(p).not.toContain("{0}");
    expect(p).not.toContain("{1:N2}");
    expect(p).not.toContain("{name}");
    expect(restore(p, tokens)).toBe(src);
  });

  it("round-trips printf positional and plain specifiers", () => {
    const src = "%1$s spent %.2f on %s";
    const { protected: p, tokens } = protect(src);
    expect(tokens.size).toBe(3);
    expect(restore(p, tokens)).toBe(src);
  });

  it("round-trips HTML entities", () => {
    const src = "Hello&nbsp;world&amp;more";
    const { protected: p, tokens } = protect(src);
    expect(tokens.size).toBe(2);
    expect(restore(p, tokens)).toBe(src);
  });

  it("survives translator-shaped reordering (placeholder still restored when surrounding text changes)", () => {
    const src = "Hello {{name}}, you have {{count}} new items!";
    const { protected: p, tokens } = protect(src);
    const fauxTranslated = p
      .replace("Hello", "Bonjour")
      .replace("you have", "vous avez")
      .replace("new items", "nouveaux éléments");
    const restored = restore(fauxTranslated, tokens);
    expect(restored).toContain("{{name}}");
    expect(restored).toContain("{{count}}");
    expect(restored).toBe(
      "Bonjour {{name}}, vous avez {{count}} nouveaux éléments!",
    );
  });

  it("handles empty input safely", () => {
    const { protected: p, tokens } = protect("");
    expect(p).toBe("");
    expect(tokens.size).toBe(0);
    expect(restore("", tokens)).toBe("");
  });

  it("ignores text with no placeholders", () => {
    const src = "Just a plain sentence.";
    const { protected: p, tokens } = protect(src);
    expect(p).toBe(src);
    expect(tokens.size).toBe(0);
  });

  it("uses unique sentinel tokens within a single protect() call", () => {
    const src = "{{a}} {{b}} {{c}} {{d}}";
    const { protected: p, tokens } = protect(src);
    const matches = p.match(/RTKEEP\d{6}/g) ?? [];
    expect(new Set(matches).size).toBe(matches.length);
    expect(tokens.size).toBe(4);
  });

  it("accepts custom patterns", () => {
    const src = "Token <<KEEP>> here";
    const { protected: p, tokens } = protect(src, ["<<KEEP>>"]);
    expect(p).not.toContain("<<KEEP>>");
    expect(tokens.size).toBe(1);
    expect(restore(p, tokens)).toBe(src);
  });

  it("silently ignores invalid custom regexes and still applies defaults", () => {
    const src = "Hello {{name}}";
    const { protected: p, tokens } = protect(src, ["[invalid("]);
    expect(tokens.size).toBe(1);
    expect(restore(p, tokens)).toBe(src);
  });

  it("restore() leaves unknown tokens untouched", () => {
    expect(restore("Hello RTKEEP999999!", new Map())).toBe(
      "Hello RTKEEP999999!",
    );
  });
});
