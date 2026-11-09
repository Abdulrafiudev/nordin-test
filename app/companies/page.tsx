import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { CompaniesScreen } from "@/features/companies/companies-screen";
import { getLocale, getMessages } from "@/lib/i18n/server";

export default async function CompaniesPage() {
  const m = await getMessages(await getLocale());
  return <AppShell><Suspense fallback={<p role="status">{m.loading}</p>}>
    <CompaniesScreen heading={<><p className="eyebrow">{m.directory}</p><h1 id="companies-heading" tabIndex={-1}>{m.companies}</h1><p className="page-description">{m.description}</p></>} />
  </Suspense></AppShell>;
}
