"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale, Messages } from "./types";

const LocaleContext = createContext<{ locale: Locale; messages: Messages } | null>(null);
export function LocaleProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  return <LocaleContext.Provider value={{ locale, messages }}>{children}</LocaleContext.Provider>;
}
export function useLocale() { const value = useContext(LocaleContext); if (!value) throw new Error("LocaleProvider is required"); return value; }
export function LanguageToggle() {
  const { locale, messages: m } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <div className="language-toggle" role="group" aria-label={m.language} aria-busy={pending}>
    {(["en", "nl"] as const).map((value) => <button key={value} type="button" aria-pressed={locale === value} aria-disabled={pending}
      onClick={() => { if (pending) return; document.cookie = `locale=${value}; Path=/; Max-Age=31536000; SameSite=Lax`; startTransition(() => router.refresh()); }}>
      {value.toUpperCase()}
    </button>)}
  </div>;
}
