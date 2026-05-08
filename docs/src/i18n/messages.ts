import commonEn from "../content/i18n/common.en.json";
import navEn from "../content/i18n/nav.en.json";
import pagesEn from "../content/i18n/pages.en.json";
import { defaultLocale } from "./locales";
import type { NavItemKey, NavSectionKey, PageSlug } from "./routes";

export type CommonMessages = typeof commonEn;
export type NavMessages = typeof navEn;
export type PagesMessages = typeof pagesEn;
export type PageMessages<TSlug extends PageSlug = PageSlug> =
  PagesMessages[TSlug];

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
type JsonObject = { readonly [key: string]: JsonValue };

const commonModules = import.meta.glob<unknown>("../content/i18n/common.*.json", {
  eager: true,
  import: "default",
});
const navModules = import.meta.glob<unknown>("../content/i18n/nav.*.json", {
  eager: true,
  import: "default",
});
const pagesModules = import.meta.glob<unknown>("../content/i18n/pages.*.json", {
  eager: true,
  import: "default",
});

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  return isJsonObject(value) && Object.values(value).every(isJsonValue);
}

function mergeJson(defaultValue: JsonValue, localizedValue: unknown): JsonValue {
  if (!isJsonObject(defaultValue)) {
    return isJsonValue(localizedValue) ? localizedValue : defaultValue;
  }

  const localizedObject = isJsonObject(localizedValue) ? localizedValue : {};
  const merged: Record<string, JsonValue> = {};

  for (const [key, value] of Object.entries(localizedObject)) {
    if (isJsonValue(value)) {
      merged[key] = value;
    }
  }

  for (const [key, value] of Object.entries(defaultValue)) {
    merged[key] = mergeJson(value, localizedObject[key]);
  }

  return merged;
}

function mergeMessages<T>(defaults: T, localized: unknown): T {
  return mergeJson(defaults as JsonValue, localized) as T;
}

function getModule<T>(
  modules: Record<string, unknown>,
  path: string,
  locale: string,
  defaults: T,
): T {
  const localized =
    modules[`../content/i18n/${path}.${locale}.json`] ??
    modules[`../content/i18n/${path}.${defaultLocale}.json`] ??
    defaults;

  return mergeMessages(defaults, localized);
}

export function getCommonMessages(locale: string): CommonMessages {
  return getModule(commonModules, "common", locale, commonEn);
}

export function getNavMessages(locale: string): NavMessages {
  return getModule(navModules, "nav", locale, navEn);
}

export function getPagesMessages(locale: string): PagesMessages {
  return getModule(pagesModules, "pages", locale, pagesEn);
}

export function getPageMessages<TSlug extends PageSlug>(
  locale: string,
  slug: TSlug,
): PageMessages<TSlug> {
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
