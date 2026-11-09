import type { Metadata } from "next";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = { title: "Companies · Nordin", description: "A little context. Better conversations. Your company workspace." };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  return <html lang={locale}><body><Providers locale={locale} messages={messages}>{children}</Providers></body></html>;
}
