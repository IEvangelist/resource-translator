import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/postcss";

const site = process.env.SITE_URL ?? "https://ievangelist.github.io";
const base = process.env.BASE_PATH ?? "/resource-translator";

export default defineConfig({
  site,
  base,
  trailingSlash: "ignore",
  integrations: [sitemap()],
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

