import { applyGlossary } from "../src/helpers/glossary";

describe("applyGlossary", () => {
  it("returns the input untouched when the glossary is empty or missing", () => {
    const translations = { greet: "Bonjour, monde!" };
    expect(applyGlossary(translations, undefined)).toEqual(translations);
    expect(applyGlossary(translations, {})).toEqual(translations);
  });

  it("returns undefined when translations are undefined", () => {
    expect(applyGlossary(undefined, { foo: "bar" })).toBeUndefined();
  });

  it("replaces standalone glossary terms (whole-word match)", () => {
    const out = applyGlossary(
      {
        title: "Welcome to Acme!",
        body: "Acme is great. Thanks for using Acme.",
        nested: "submarine and acmeization should not match",
      },
      { Acme: "Contoso" },
    );

    expect(out).toEqual({
      title: "Welcome to Contoso!",
      body: "Contoso is great. Thanks for using Contoso.",
      nested: "submarine and acmeization should not match",
    });
  });

  it("escapes regex metacharacters in glossary terms", () => {
    const out = applyGlossary(
      { msg: "Use C++ or .NET in production." },
      { "C++": "Rust", ".NET": "Java" },
    );
    expect(out!.msg).toEqual("Use Rust or Java in production.");
  });

  it("ignores entries with empty term or replacement", () => {
    const translations = { title: "Acme is great" };
    const out = applyGlossary(translations, {
      "": "should-not-appear",
      Acme: "",
    });
    expect(out!.title).toEqual("Acme is great");
  });
});
