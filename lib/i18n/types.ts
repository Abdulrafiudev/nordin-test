import type messages from "./en.json";
export type Messages = typeof messages;
export type Locale = "en" | "nl";
export function dateLocale(locale: Locale) { return locale === "nl" ? "nl-NL" : "en-GB"; }
export function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}
