"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createCompaniesClient, type CompaniesClient } from "@/features/companies/api";
import { getDemoToken, getServerSessionSnapshot, getSessionSnapshot, revokeDemoSession, setDemoToken, subscribeSession } from "./session";

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
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot, getServerSessionSnapshot);
  const queryClient = useQueryClient();
  const signOut = useCallback(() => {
    if (!revokeDemoSession()) return;
    void queryClient.cancelQueries();
    queryClient.clear();
    // The protected screen owns the redirect, including return URL and initial sign-in checks.
  }, [queryClient]);
  const api = useMemo(() => createCompaniesClient({ getToken: getDemoToken, onUnauthorized: signOut }), [signOut]);
  const signIn = useCallback((value: string) => {
    queryClient.clear();
    setDemoToken(value);
  }, [queryClient]);
  return <AuthContext.Provider value={{ ready: session !== undefined, signedIn: session === "signed-in", api, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error("AuthProvider is required"); return value; }
