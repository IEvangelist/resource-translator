import commonEn from "../content/i18n/common.en.json";
import navEn from "../content/i18n/nav.en.json";
import pagesEn from "../content/i18n/pages.en.json";
import { defaultLocale } from "./locales";
import type { NavItemKey, NavSectionKey, PageSlug } from "./routes";

export type CommonMessages = typeof commonEn;
export type NavMessages = typeof navEn;
export type PagesMessages = typeof pagesEn;
export type PageMessages = PagesMessages[PageSlug];

const commonModules = import.meta.glob<CommonMessages>(
  "../content/i18n/common.*.json",
  { eager: true, import: "default" },
);
const navModules = import.meta.glob<NavMessages>("../content/i18n/nav.*.json", {
  eager: true,
  import: "default",
});
const pagesModules = import.meta.glob<PagesMessages>(
  "../content/i18n/pages.*.json",
  { eager: true, import: "default" },
);

function getModule<T>(
  modules: Record<string, T>,
  path: string,
  locale: string,
): T {
  return (
    modules[`../content/i18n/${path}.${locale}.json`] ??
    modules[`../content/i18n/${path}.${defaultLocale}.json`]
  );
}

export function getCommonMessages(locale: string): CommonMessages {
  return getModule(commonModules, "common", locale);
}

export function getNavMessages(locale: string): NavMessages {
  return getModule(navModules, "nav", locale);
}

export function getPagesMessages(locale: string): PagesMessages {
  return getModule(pagesModules, "pages", locale);
}

export function getPageMessages(
  locale: string,
  slug: PageSlug,
): PageMessages {
  return getPagesMessages(locale)[slug];
}

export function getNavSectionLabel(
  nav: NavMessages,
  key: NavSectionKey,
): string {
  return nav.sections[key];
}

export function getNavItemLabel(nav: NavMessages, key: NavItemKey): string {
  return nav.items[key];
}

export function getSiteMessages(locale: string) {
  return {
    common: getCommonMessages(locale),
    nav: getNavMessages(locale),
    pages: getPagesMessages(locale),
  };
}
