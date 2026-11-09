"use client";
import { useLocale } from "@/lib/i18n/provider";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { messages: m } = useLocale();
  return <main className="route-error"><h1>{m.errorTitle}</h1><p role="alert">{m.errorDescription}</p><button className="button button-primary" onClick={reset}>{m.retry}</button></main>;
}
