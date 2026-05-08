import azureLocales from "../data/azure-locales.json";

export const defaultLocale = "en";

export type AzureLocale = (typeof azureLocales)[number] & { bcp47?: string };

export type LocaleInfo = {
  code: string;
  englishName: string;
  nativeName: string;
  rtl: boolean;
  bcp47?: string;
};

export const sourceLocale: LocaleInfo = {
  code: defaultLocale,
  englishName: "English",
  nativeName: "English",
  rtl: false,
};

export const targetLocales = azureLocales as AzureLocale[];

export const allLocales: LocaleInfo[] = [sourceLocale, ...targetLocales];

export const targetLocaleCodes = targetLocales.map((locale) => locale.code);

export const allLocaleCodes = allLocales.map((locale) => locale.code);

export function getLocaleInfo(locale: string | undefined): LocaleInfo {
  if (!locale || locale === defaultLocale) return sourceLocale;
  return targetLocales.find((item) => item.code === locale) ?? sourceLocale;
}

export function isTargetLocale(locale: string | undefined): boolean {
  return !!locale && targetLocaleCodes.includes(locale);
}

export function isSupportedLocale(locale: string | undefined): boolean {
  return locale === defaultLocale || isTargetLocale(locale);
}

export function toHtmlLang(locale: string | undefined): string {
  const info = getLocaleInfo(locale);
  return info.bcp47 ?? info.code;
}

export function toTextDirection(locale: string | undefined): "ltr" | "rtl" {
  return getLocaleInfo(locale).rtl ? "rtl" : "ltr";
}
