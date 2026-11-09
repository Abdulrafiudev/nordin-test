"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth/provider";
import { LocaleProvider } from "@/lib/i18n/provider";
import type { Locale, Messages } from "@/lib/i18n/types";

export function Providers({ children, locale, messages }: { children: React.ReactNode; locale: Locale; messages: Messages }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { mutations: { retry: false } } }));
  return <QueryClientProvider client={queryClient}><LocaleProvider locale={locale} messages={messages}>
    <AuthProvider>{children}</AuthProvider>
  </LocaleProvider></QueryClientProvider>;
}
