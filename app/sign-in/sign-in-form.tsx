"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Building2, Check } from "lucide-react";
import { Brand } from "@/components/app-shell";
import { safeReturnPath, useAuth } from "@/lib/auth/provider";
import { LanguageToggle, useLocale } from "@/lib/i18n/provider";

export function SignInForm() {
  const { messages: m } = useLocale();
  const { signIn } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [token, setToken] = useState("demo-session");
  const [error, setError] = useState<"empty" | "storage" | null>(null);
  return <main className="sign-in-page"><div className="sign-in-top"><Brand /><LanguageToggle /></div>
    <div className="sign-in-content"><div className="sign-in-illustration" aria-hidden="true"><span className="illustration-orbit" /><span className="illustration-card"><Building2 size={35} /><span className="illustration-check"><Check size={16} /></span></span></div>
      <p className="eyebrow">{m.demoLabel}</p><h1>{m.signInTitle}</h1><p className="sign-in-description">{m.signInDescription}</p>
      <form className="sign-in-form" onSubmit={(event) => {
        event.preventDefault();
        if (!token.trim()) { setError("empty"); return; }
        try { signIn(token); router.replace(safeReturnPath(search.get("next"))); }
        catch { setError("storage"); }
      }} noValidate>
        <label htmlFor="demo-token">{m.tokenLabel}</label><input id="demo-token" value={token} onChange={(event) => { setToken(event.target.value); setError(null); }} aria-invalid={error === "empty"} aria-describedby={error ? "sign-in-error" : "demo-note"} autoComplete="off" />
        {error && <p id="sign-in-error" role="alert" className="field-error">{error === "empty" ? m.tokenRequired : m.signInStorageError}</p>}
        <button type="submit" className="button button-primary">{m.signIn}<ArrowRight size={17} /></button>
        <p id="demo-note" className="sign-in-note">{m.demoNote}</p>
      </form>
    </div><div className="sign-in-footer">nordin · {m.workspaceHint}</div>
  </main>;
}
