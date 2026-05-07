import { defineEcConfig } from "astro-expressive-code";

export default defineEcConfig({
  // Catppuccin's pastel palette echoes our indigo→fuchsia→amber brand and
  // ships with both `mocha` (dark) and `latte` (light) variants tuned to be
  // legible at small sizes. Latte is listed first so it's the default base
  // theme; Mocha is layered on top via the [data-theme] selector below.
  //
  // We follow EC's documented dual-theme pattern: each theme is keyed to a
  // `data-theme` attribute on <html>, and Header.astro keeps that attribute
  // in sync with our manual `.dark` class. Returning a top-level selector
  // like `html.dark` directly here breaks because EC concatenates the
  // returned string onto `.expressive-code` without a descendant combinator,
  // producing invalid CSS like `.expressive-codehtml.dark`.
  themes: ["catppuccin-latte", "catppuccin-mocha"],
  themeCssSelector: (theme) => `[data-theme='${theme.name}']`,
  styleOverrides: {
    borderRadius: "0.875rem",
    borderWidth: "1px",
    borderColor: "var(--border)",
    codeFontFamily:
      '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    codeFontSize: "0.9rem",
    codeLineHeight: "1.55",
    codePaddingBlock: "1.05rem",
    codePaddingInline: "1.15rem",
    frames: {
      shadowColor: "transparent",
      editorActiveTabIndicatorTopColor: "var(--color-accent-500)",
      editorActiveTabIndicatorBottomColor: "transparent",
      editorTabBarBackground: "var(--bg-elevated)",
      editorTabBarBorderBottomColor: "var(--border)",
      terminalTitlebarBackground: "var(--bg-elevated)",
      terminalTitlebarBorderBottomColor: "var(--border)",
    },
  },
  defaultProps: {
    wrap: false,
    showLineNumbers: false,
  },
});

