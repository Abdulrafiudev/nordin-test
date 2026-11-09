"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, X } from "lucide-react";
import { useAuth } from "@/lib/auth/provider";
import { LanguageToggle, useLocale } from "@/lib/i18n/provider";
import { ApiError } from "./api";
import { companyOptions } from "./queries";
import { CompanyForm } from "./company-form";

type Props = {
  drawer: { mode: "edit"; id: string } | { mode: "create" };
  onClose: () => void; onSaved: (created: boolean) => void;
};
export function CompanyDrawer({ drawer, onClose, onSaved }: Props) {
  const { messages: m } = useLocale();
  const { api } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = drawer.mode === "edit" ? drawer.id : "";
  const query = useQuery({ ...companyOptions(id, api), enabled: drawer.mode === "edit" });
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      queueMicrotask(() => {
        if (opener instanceof HTMLElement && opener.isConnected && opener !== document.body) opener.focus();
        else document.getElementById("companies-heading")?.focus();
      });
    };
  }, []);
  const missing = query.error instanceof ApiError && query.error.status === 404;
  return <dialog ref={dialog} className="company-drawer" aria-labelledby="drawer-title" aria-describedby="drawer-description" onCancel={(event) => { event.preventDefault(); onClose(); }}
    onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, a[href], [tabindex='0']"))
        .sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
    <div className="drawer-header"><span className="drawer-heading-icon"><Building2 size={20} /></span><button className="icon-button close-drawer" onClick={onClose} aria-label={m.close}><X size={20} /></button>
      <LanguageToggle />
      <h2 id="drawer-title">{drawer.mode === "create" ? m.create : m.details}</h2><p id="drawer-description">{drawer.mode === "create" ? m.createDescription : m.detailsDescription}</p>
    </div>
    {drawer.mode === "create" ? <CompanyForm company={null} onClose={onClose} onSaved={onSaved} />
      : query.data ? <CompanyForm company={query.data} onClose={onClose} onSaved={onSaved} />
      : query.isError ? <div className="drawer-state"><span className="empty-icon"><Building2 size={26} /></span><h3>{missing ? m.notFound : m.drawerError}</h3><p role="alert">{missing ? m.notFoundDescription : m.drawerError}</p>{!missing && <button className="button button-secondary" onClick={() => { void query.refetch(); }}>{m.retry}</button>}</div>
      : <div className="drawer-loading" role="status" aria-busy="true"><p>{m.drawerLoading}</p><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>}
  </dialog>;
}
