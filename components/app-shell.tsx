"use client";

import { Building2, ChevronDown, ChevronRight, LogOut, Layers3 } from "lucide-react";
import { useAuth } from "@/lib/auth/provider";
import { LanguageToggle, useLocale } from "@/lib/i18n/provider";

export function Brand() { return <span className="brand"><span className="brand-symbol" aria-hidden="true">n</span>nordin<span className="brand-dot">.</span></span>; }
export function AppShell({ children }: { children: React.ReactNode }) {
  const { messages: m } = useLocale();
  const { signOut } = useAuth();
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">{m.skipContent}</a>
    <aside className="sidebar">
      <div className="sidebar-brand"><Brand /></div>
      <div className="workspace-card"><span className="workspace-icon"><Layers3 size={18} /></span>
        <div><strong>{m.workspaceName}</strong><span>{m.workspaceHint}</span></div><ChevronDown size={14} aria-hidden="true" />
      </div>
      <nav aria-label={m.navigation}><p className="nav-label">{m.workspace}</p>
        <a className="nav-item active" href="/companies" aria-current="page"><Building2 size={18} />{m.companies}<span className="nav-dot" /></a>
      </nav>
      <div className="sidebar-bottom"><div className="workspace-avatar">DW</div><div><strong>{m.workspaceName}</strong><span>{m.demoLabel}</span></div>
        <button className="icon-button" type="button" onClick={signOut} aria-label={m.signOut}><LogOut size={17} /></button>
      </div>
    </aside>
    <div className="app-main"><header className="topbar"><div className="breadcrumbs"><span>{m.workspace}</span><ChevronRight size={13} /><strong>{m.companies}</strong></div>
      <div className="topbar-actions"><LanguageToggle /><span className="topbar-separator" /><span className="user-avatar" title={m.workspaceName}>D</span></div>
    </header><main id="main-content" className="content">{children}</main></div>
  </div>;
}
