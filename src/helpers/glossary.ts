/**
 * Applies a glossary of post-translation term overrides to translated text.
 * The glossary maps a source-language term to its preferred translation; any
 * standalone occurrence (word boundary) of that term is replaced. Terms
 * containing non-word characters (e.g. "C++", ".NET") use a non-word/start
 * boundary check so they still match correctly.
 */
export const applyGlossary = (
  translations: Record<string, string> | undefined,
  glossary: Record<string, string> | undefined,
): Record<string, string> | undefined => {
  if (!translations) return translations;
  if (!glossary) return translations;

  const entries = Object.entries(glossary).filter(
    ([term, replacement]) => !!term && !!replacement,
  );
  if (!entries.length) return translations;

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(translations)) {
    let next = value;
    for (const [term, replacement] of entries) {
      next = next.replace(buildTermRegex(term), replacement);
    }
    out[key] = next;
  }
  return out;
};

const buildTermRegex = (term: string): RegExp => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startsWithWord = /^\w/.test(term);
  const endsWithWord = /\w$/.test(term);
  const left = startsWithWord ? "\\b" : "(?<!\\w)";
  const right = endsWithWord ? "\\b" : "(?!\\w)";
  return new RegExp(`${left}${escaped}${right}`, "g");
};
