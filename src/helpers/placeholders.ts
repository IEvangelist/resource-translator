/**
 * Placeholder protection — wraps tokens like `{{name}}`, `{0}`, `%s`, `${var}`
 * into stable sentinels before sending text to Translator and unwraps them on
 * the way back out. Without this, Azure Translator regularly rewrites these
 * tokens (rearranging arg numbers, translating placeholder *names*, splitting
 * `%1$s` across words, ...) and the resulting localized strings break runtime
 * formatting in any language other than English.
 *
 * The sentinel uses a long ASCII run that survives every Translator language
 * unchanged and never collides with real source content. It is intentionally
 * NOT a Unicode private-use codepoint or control character — Azure normalizes
 * many of those away.
 */

/**
 * Default placeholder patterns. Order matters — more specific matches (e.g.
 * printf `%1$s`) come before less specific ones (e.g. plain `%s`) so the
 * larger token wins.
 */
export const DEFAULT_PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  // i18next / Mustache / Handlebars: {{name}} or {{ name }}
  /\{\{\s*[\w.\-:|]+\s*\}\}/g,
  // ES template literals / shell-ish: ${name}
  /\$\{[\w.-]+\}/g,
  // .NET / C# / Java composite formatting: {0}, {0:format}, {name}, {name,10:N2}
  /\{\d+(?:[,:][^{}]*)?\}/g,
  /\{[A-Za-z_][\w.-]*(?:[,:][^{}]*)?\}/g,
  // printf positional & flagged: %1$s, %2$d, %.2f, %-10s
  /%\d+\$[#\-+ 0,]*\d*(?:\.\d+)?[diouxXeEfgGsScCpn%]/g,
  /%[#\-+ 0,]*\d*(?:\.\d+)?[diouxXeEfgGsScCpn%]/g,
  // XML/HTML-ish entities the user pasted as literal source text (e.g. &nbsp;)
  /&[a-zA-Z]+;/g,
];

const TOKEN_PREFIX = "RTKEEP";
const TOKEN_RE = /RTKEEP(\d{6})/g;

export interface ProtectResult {
  /** Text with placeholders replaced by sentinel tokens. */
  protected: string;
  /** Map of sentinel token -> original placeholder text. */
  tokens: Map<string, string>;
}

const compileExtraPatterns = (customPatterns?: readonly string[]): RegExp[] => {
  if (!customPatterns?.length) return [];
  const compiled: RegExp[] = [];
  for (const raw of customPatterns) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    try {
      // Always force the global flag so `replace(re, fn)` walks every match.
      compiled.push(
        new RegExp(trimmed, trimmed.startsWith("/") ? undefined : "g"),
      );
    } catch {
      // Skip invalid user-supplied regexes silently — they are surfaced as
      // warnings during input validation, so by the time we get here we just
      // want translation to still proceed.
    }
  }
  return compiled;
};

/**
 * Replace any placeholder occurrences in `text` with stable sentinel tokens.
 * Returns the protected text plus a map you can later pass to `restore`.
 *
 * @example
 *   const { protected: p, tokens } = protect("Hello {{name}}!");
 *   // p === "Hello RTKEEP000001!"
 *   restore("Bonjour RTKEEP000001!", tokens) === "Bonjour {{name}}!"
 */
export const protect = (
  text: string,
  customPatterns?: readonly string[],
): ProtectResult => {
  const tokens = new Map<string, string>();
  if (!text) return { protected: text, tokens };

  const patterns = [
    ...DEFAULT_PLACEHOLDER_PATTERNS,
    ...compileExtraPatterns(customPatterns),
  ];

  let next = text;
  let counter = 0;
  for (const re of patterns) {
    next = next.replace(re, (match) => {
      const token = `${TOKEN_PREFIX}${String(counter++).padStart(6, "0")}`;
      tokens.set(token, match);
      return token;
    });
  }

  return { protected: next, tokens };
};

/**
 * Restore previously-protected placeholders. Robust against minor mangling:
 * matches the sentinel pattern with a regex (case-insensitive) so a
 * Translator that lower-cases the string still round-trips correctly.
 */
export const restore = (text: string, tokens: Map<string, string>): string => {
  if (!text || tokens.size === 0) return text;
  return text.replace(TOKEN_RE, (match) => tokens.get(match) ?? match);
};
