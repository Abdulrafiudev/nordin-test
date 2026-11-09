import { act, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { CompaniesScreen } from "@/features/companies/companies-screen";
import { companyKeys } from "@/features/companies/queries";
import { parseCompanyUrl } from "@/features/companies/url-state";
import { LocaleProvider } from "@/lib/i18n/provider";
import messages from "@/lib/i18n/en.json";
import { seedCompanies } from "@/server/companies-store";

const auth = vi.hoisted(() => ({ ready: false }));
vi.mock("@/lib/auth/provider", async () => {
  const { createCompaniesClient } = await import("@/features/companies/api");
  const api = createCompaniesClient({ getToken: () => "demo", onUnauthorized: () => {} });
  return { useAuth: () => ({ ready: auth.ready, signedIn: auth.ready, api }) };
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: () => {} }),
  useSearchParams: () => new URLSearchParams("page=2"),
}));

it("hydrates a delayed page boundary after auth becomes ready without leaving Create disabled", async () => {
  const client = new QueryClient();
  const params = parseCompanyUrl(new URLSearchParams("page=2")).params;
  client.setQueryData(companyKeys.list(params), {
    items: seedCompanies().slice(20), total: 40, limit: 20, offset: 20,
  });
  const tree = <QueryClientProvider client={client}><LocaleProvider locale="en" messages={messages}>
    <CompaniesScreen heading={<h1>Companies</h1>} />
  </LocaleProvider></QueryClientProvider>;
  const container = document.createElement("div");
  auth.ready = false;
  container.innerHTML = renderToString(tree);
  expect(within(container).getByRole("button", { name: "Create company" })).toBeDisabled();
  document.body.append(container);
  // A provider outside the streamed boundary can be ready before that boundary hydrates.
  auth.ready = true;
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const recoverable: unknown[] = [];
  let root: Root | undefined;
  try {
    await act(async () => { root = hydrateRoot(container, tree, { onRecoverableError: (error) => recoverable.push(error) }); });
    expect(within(container).getByRole("button", { name: "Create company" })).toBeEnabled();
    expect(within(container).getByRole("button", { name: "Harbor Technologies" })).toBeInTheDocument();
    expect(recoverable).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
    client.clear();
  }
});
