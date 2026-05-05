import { defineEcConfig } from "astro-expressive-code";

export default defineEcConfig({
  themes: ["github-dark", "github-light"],
  themeCssSelector: (theme) =>
    theme.name === "github-dark" ? "html.dark" : "html:not(.dark)",
  styleOverrides: {
    borderRadius: "0.75rem",
    codeFontFamily:
      '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    frames: {
      shadowColor: "transparent",
    },
  },
  defaultProps: {
    wrap: false,
  },
});
