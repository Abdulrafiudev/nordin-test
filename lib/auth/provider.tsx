"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createCompaniesClient, type CompaniesClient } from "@/features/companies/api";

const TOKEN_KEY = "nordin-demo-token";
type AuthContextValue = { ready: boolean; signedIn: boolean; api: CompaniesClient; signIn: (token: string) => void; signOut: () => void };
const AuthContext = createContext<AuthContextValue | null>(null);

export function safeReturnPath(value: string | null) {
  if (!value) return "/companies";
  try {
    const url = new URL(value, "http://local");
    return url.origin === "http://local" && url.pathname === "/companies" ? `${url.pathname}${url.search}` : "/companies";
  } catch { return "/companies"; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const token = useRef<string | null>(null);
  const redirecting = useRef(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  useEffect(() => {
    try { token.current = sessionStorage.getItem(TOKEN_KEY); } catch { token.current = null; }
    setSignedIn(Boolean(token.current));
    setReady(true);
  }, []);
  const signOut = useCallback(() => {
    if (redirecting.current) return;
    redirecting.current = true;
    token.current = null;
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* The in-memory session is already cleared. */ }
    setSignedIn(false);
    void queryClient.cancelQueries();
    queryClient.clear();
    const next = safeReturnPath(`${window.location.pathname}${window.location.search}`);
    router.replace(`/sign-in?next=${encodeURIComponent(next)}`);
  }, [queryClient, router]);
  const getToken = useCallback(() => token.current, []);
  const api = useMemo(() => createCompaniesClient({ getToken, onUnauthorized: signOut }), [getToken, signOut]);
  const signIn = useCallback((value: string) => {
    const nextToken = value.trim();
    if (!nextToken) throw new Error("Empty demo token");
    sessionStorage.setItem(TOKEN_KEY, nextToken);
    token.current = nextToken;
    redirecting.current = false;
    queryClient.clear();
    setSignedIn(true);
    setReady(true);
  }, [queryClient]);
  return <AuthContext.Provider value={{ ready, signedIn, api, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("AuthProvider is required"); return value; }
