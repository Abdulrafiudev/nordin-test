import "server-only";
import { cookies } from "next/headers";
import type { Locale, Messages } from "./types";

export async function getLocale(): Promise<Locale> { return (await cookies()).get("locale")?.value === "nl" ? "nl" : "en"; }
export async function getMessages(locale: Locale): Promise<Messages> {
  return locale === "nl" ? (await import("./nl.json")).default : (await import("./en.json")).default;
}
