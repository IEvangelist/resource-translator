import { defaultLocale, isTargetLocale } from "./locales";

export const pageSlugs = [
  "index",
  "getting-started",
  "configuration",
  "inputs",
  "formats",
  "recipes",
  "faq",
  "translations",
  "contributing",
  "changelog",
] as const;

export type PageSlug = (typeof pageSlugs)[number];

export type NavItemKey =
  | "overview"
  | "gettingStarted"
  | "configuration"
  | "inputs"
  | "formats"
  | "recipes"
  | "faq"
  | "translations"
  | "contributing"
  | "changelog";

export type NavSectionKey = "start" | "reference" | "showcase" | "project";

export type NavItemDefinition = {
  key: NavItemKey;
  slug: PageSlug;
  icon: string;
};

export type NavSectionDefinition = {
  key: NavSectionKey;
  icon: string;
  items: NavItemDefinition[];
};

export const navSections: NavSectionDefinition[] = [
  {
    key: "start",
    icon: "lucide:rocket",
    items: [
      { key: "overview", slug: "index", icon: "lucide:sparkles" },
      { key: "gettingStarted", slug: "getting-started", icon: "lucide:zap" },
      { key: "configuration", slug: "configuration", icon: "lucide:settings-2" },
    ],
  },
  {
    key: "reference",
    icon: "lucide:code-2",
    items: [
      { key: "inputs", slug: "inputs", icon: "lucide:file-text" },
      { key: "formats", slug: "formats", icon: "lucide:package" },
      { key: "recipes", slug: "recipes", icon: "lucide:wand-sparkles" },
      { key: "faq", slug: "faq", icon: "lucide:circle-help" },
    ],
  },
  {
    key: "showcase",
    icon: "lucide:sparkles",
    items: [
      { key: "translations", slug: "translations", icon: "lucide:languages" },
    ],
  },
  {
    key: "project",
    icon: "lucide:folder-git-2",
    items: [
      { key: "contributing", slug: "contributing", icon: "lucide:hand-heart" },
      { key: "changelog", slug: "changelog", icon: "lucide:history" },
    ],
  },
];

export const flatNavItems = navSections.flatMap((section) => section.items);

export function slugToHref(slug: PageSlug): string {
  return slug === "index" ? "/" : `/${slug}`;
}

export function pathForLocale(locale: string, slugOrHref: PageSlug | string): string {
  const href = slugOrHref.startsWith("/")
    ? slugOrHref
    : slugToHref(slugOrHref as PageSlug);
  const cleanHref = href === "/" ? "" : href.replace(/^\/|\/$/g, "");
  const localePrefix = locale === defaultLocale ? "" : `/${locale}`;
  const path = `${localePrefix}${cleanHref ? `/${cleanHref}` : ""}`;
  return path || "/";
}

export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}${path === "/" ? "" : path}` || "/";
}

export function localizedHref(locale: string, slugOrHref: PageSlug | string): string {
  return withBase(pathForLocale(locale, slugOrHref));
}

export function stripBase(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const withoutBase =
    base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  return withoutBase.replace(/\/$/, "") || "/";
}

export function localeFromPath(pathname: string): string {
  const clean = stripBase(pathname);
  const first = clean.split("/").filter(Boolean)[0];
  return isTargetLocale(first) ? first : defaultLocale;
}

export function slugFromPath(pathname: string): PageSlug {
  const clean = stripBase(pathname);
  const parts = clean.split("/").filter(Boolean);
  const locale = isTargetLocale(parts[0]) ? parts.shift() : undefined;
  void locale;
  const slug = parts[0] ?? "index";
  return pageSlugs.includes(slug as PageSlug) ? (slug as PageSlug) : "index";
}
