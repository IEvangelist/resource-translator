import { defineEcConfig } from "astro-expressive-code";

export default defineEcConfig({
  // Catppuccin's pastel palette echoes our indigo→fuchsia→amber brand and
  // ships with both `mocha` (dark) and `latte` (light) variants tuned to be
  // legible at small sizes. The selector keys them to our manual theme toggle.
  themes: ["catppuccin-mocha", "catppuccin-latte"],
  themeCssSelector: (theme) =>
    theme.name === "catppuccin-mocha" ? "html.dark" : "html:not(.dark)",
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

