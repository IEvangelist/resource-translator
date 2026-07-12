import {
  createTranslationStateEntries,
  groupPendingTranslationPlans,
  planLocaleTranslations,
} from "../../src/helpers/change-detection";
import { hashText } from "../../src/helpers/translation-state";

describe("smart change detection planner", () => {
  const sourceText = new Map([
    ["Hello", "Hello"],
    ["World", "World"],
  ]);
  const targetText = new Map([
    ["Hello", "Bonjour"],
    ["World", "Monde"],
  ]);
  const fingerprint = "fingerprint";

  it("bootstraps every key when state is missing", () => {
    const plan = planLocaleTranslations({
      locale: "fr",
      targetPath: "src/Test.fr.resx",
      sourceText,
      targetText,
      targetExists: true,
      fingerprint,
      bootstrap: true,
      disabled: false,
    });

    expect([...plan.pendingText.keys()]).toEqual(["Hello", "World"]);
    expect(plan.ruleCounts.TRANSLATE_BOOTSTRAP).toBe(2);
  });

  it("translates only changed source values", () => {
    const plan = planLocaleTranslations({
      locale: "fr",
      targetPath: "src/Test.fr.resx",
      sourceText: new Map([
        ["Hello", "Hello updated"],
        ["World", "World"],
      ]),
      targetText,
      targetExists: true,
      stateLocale: {
        targetPath: "src/Test.fr.resx",
        keys: {
          Hello: {
            sourceHash: hashText("Hello"),
            targetHash: hashText("Bonjour"),
            fingerprint,
          },
          World: {
            sourceHash: hashText("World"),
            targetHash: hashText("Monde"),
            fingerprint,
          },
        },
      },
      fingerprint,
      bootstrap: false,
      disabled: false,
    });

    expect([...plan.pendingText.keys()]).toEqual(["Hello"]);
    expect(plan.reusedTranslations).toEqual({ World: "Monde" });
    expect(plan.ruleCounts.TRANSLATE_SOURCE_CHANGED).toBe(1);
    expect(plan.ruleCounts.REUSE_UNCHANGED).toBe(1);
  });

  it("preserves manual target edits when source and settings are unchanged", () => {
    const plan = planLocaleTranslations({
      locale: "fr",
      targetPath: "src/Test.fr.resx",
      sourceText,
      targetText: new Map([
        ["Hello", "Bonjour"],
        ["World", "Monde manual"],
      ]),
      targetExists: true,
      stateLocale: {
        targetPath: "src/Test.fr.resx",
        keys: {
          Hello: {
            sourceHash: hashText("Hello"),
            targetHash: hashText("Bonjour"),
            fingerprint,
          },
          World: {
            sourceHash: hashText("World"),
            targetHash: hashText("Monde"),
            fingerprint,
          },
        },
      },
      fingerprint,
      bootstrap: false,
      disabled: false,
    });

    expect(plan.pendingText.size).toBe(0);
    expect(plan.reusedTranslations.World).toBe("Monde manual");
    expect(plan.ruleCounts.PRESERVE_MANUAL_TARGET_EDIT).toBe(1);

    const entries = createTranslationStateEntries(
      plan,
      sourceText,
      plan.reusedTranslations,
      fingerprint,
    );
    expect(entries.World.targetHash).toBe(hashText("Monde manual"));
  });

  it("groups locales with identical pending key sets", () => {
    const fr = planLocaleTranslations({
      locale: "fr",
      targetPath: "src/Test.fr.resx",
      sourceText,
      targetText: new Map(),
      targetExists: false,
      fingerprint,
      bootstrap: false,
      disabled: false,
    });
    const de = planLocaleTranslations({
      locale: "de",
      targetPath: "src/Test.de.resx",
      sourceText,
      targetText: new Map(),
      targetExists: false,
      fingerprint,
      bootstrap: false,
      disabled: false,
    });

    expect(groupPendingTranslationPlans([fr, de])).toHaveLength(1);
    expect(groupPendingTranslationPlans([fr, de])[0].locales).toEqual([
      "fr",
      "de",
    ]);
  });
});
