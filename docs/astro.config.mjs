import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import tailwindcss from "@tailwindcss/postcss";

const site = process.env.SITE_URL ?? "https://ievangelist.github.io";
const base = process.env.BASE_PATH ?? "/resource-translator";

export default defineConfig({
  site,
  base,
  trailingSlash: "ignore",
  integrations: [
    expressiveCode(),
    icon({
      include: {
        lucide: [
          "languages",
          "globe-2",
          "wand-sparkles",
          "shield-check",
          "package",
          "git-pull-request",
          "rocket",
          "sparkles",
          "zap",
          "code-2",
          "file-text",
          "file-code-2",
          "settings-2",
          "search",
          "moon",
          "sun",
          "arrow-right",
          "check",
          "circle-dashed",
          "circle-help",
          "menu",
          "x",
          "chevron-right",
          "chevron-down",
          "folder-git-2",
          "hand-heart",
          "history",
          "book-open",
          "info",
          "external-link",
          "lightbulb",
          "shield",
          "globe",
          "type",
          "filter",
          "file-code-2",
          "flag",
          "hourglass",
        ],
        "simple-icons": ["github"],
      },
    }),
    sitemap(),
  ],
  vite: {
    css: {
      postcss: {
        plugins: [tailwindcss()],
      },
    },
  },
  build: {
    format: "directory",
  },
});


