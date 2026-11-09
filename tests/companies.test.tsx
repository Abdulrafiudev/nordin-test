import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse, delay } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompaniesScreen } from "@/features/companies/companies-screen";
import { companyKeys } from "@/features/companies/queries";
import { updateCompanySchema, type Company, type UpdateCompanyInput } from "@/features/companies/contracts";
import { AuthProvider } from "@/lib/auth/provider";
import { setDemoToken } from "@/lib/auth/session";
import { LocaleProvider } from "@/lib/i18n/provider";
import messages from "@/lib/i18n/en.json";
import dutchMessages from "@/lib/i18n/nl.json";
import { seedCompanies } from "@/server/companies-store";
import { server } from "./server";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (callback: () => void) => { window.addEventListener("popstate", callback); return () => window.removeEventListener("popstate", callback); };
  return {
    useRouter: () => navigation,
    useSearchParams: () => new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search, () => "")),
  };
});

const origin = "http://localhost:3000/api/v1/companies";
const originalReplace = window.history.replaceState.bind(window.history);
const originalPush = window.history.pushState.bind(window.history);
let companies: Company[];
let requests: URL[];

beforeEach(() => {
  navigation.replace.mockReset();
  setDemoToken("demo");
  originalReplace(null, "", "/companies");
  vi.spyOn(window.history, "pushState").mockImplementation((data, unused, url) => { originalPush(data, unused, url); window.dispatchEvent(new PopStateEvent("popstate")); });
  vi.spyOn(window.history, "replaceState").mockImplementation((data, unused, url) => { originalReplace(data, unused, url); window.dispatchEvent(new PopStateEvent("popstate")); });
  companies = seedCompanies();
  requests = [];
  server.use(
    http.get(origin, async ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const status = url.searchParams.get("status");
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const filtered = companies.filter((company) => (!status || company.status === status) && (!q || company.name.toLowerCase().includes(q) || company.domain?.includes(q)));
      await delay(20);
      return HttpResponse.json({ items: filtered.slice(offset, offset + 20), total: filtered.length, limit: 20, offset });
    }),
    http.get(`${origin}/:id`, ({ params }) => {
      const company = companies.find((company) => company.id === params.id);
      return company ? HttpResponse.json(company) : HttpResponse.json({ code: "not_found", message: "Not found" }, { status: 404 });
    }),
  );
});

function renderFeature() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><LocaleProvider locale="en" messages={messages}><AuthProvider>
    <CompaniesScreen heading={<h1 id="companies-heading" tabIndex={-1}>Companies</h1>} />
  </AuthProvider></LocaleProvider></QueryClientProvider>);
  return client;
}

describe("Companies user workflows", () => {
  it("filters through URL-backed search/status, resets page, keeps the table mounted and restores Back", async () => {
    originalReplace(null, "", "/companies?page=2");
    const user = userEvent.setup();
    renderFeature();
    await screen.findByRole("button", { name: "Harbor Technologies" });
    const table = screen.getByRole("table");
    await user.type(screen.getByRole("searchbox"), "acmestudio.com");
    await user.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByRole("button", { name: "Acme Studio" });
    expect(window.location.search).toContain("page=1");
    expect(window.location.search).toContain("q=acmestudio.com");
    expect(requests.at(-1)?.searchParams.get("offset")).toBe("0");
    expect(screen.getByRole("table")).toBe(table);
    await user.selectOptions(screen.getByLabelText("Filter by status"), "qualified");
    await screen.findByRole("heading", { name: "No matching companies" });
    expect(requests.at(-1)?.searchParams.get("status")).toBe("qualified");
    expect(requests.at(-1)?.searchParams.get("q")).toBe("acmestudio.com");
    act(() => window.history.back());
    await screen.findByRole("button", { name: "Acme Studio" });
    expect(screen.getByLabelText("Filter by status")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveValue("acmestudio.com");
    expect(screen.getByRole("table")).toBe(table);
  });

  it("keeps the opened version and draft through 409, reloads latest and saves only after review", async () => {
    const user = userEvent.setup();
    const patches: UpdateCompanyInput[] = [];
    server.use(http.patch(`${origin}/:id`, async ({ request }) => {
      const input = updateCompanySchema.parse(await request.json());
      patches.push(input);
      if (patches.length === 1) {
        companies[0] = { ...companies[0], status: "contacted", domain: "latest.com", version: 2 };
        return HttpResponse.json({ code: "version_conflict", message: "Changed" }, { status: 409 });
      }
      companies[0] = { ...companies[0], name: input.name ?? companies[0].name, version: 3 };
      return HttpResponse.json(companies[0]);
    }));
    const client = renderFeature();
    await user.click(await screen.findByRole("button", { name: "Acme Studio" }));
    const input = await screen.findByRole("textbox", { name: "Company name" });
    await user.clear(input);
    await user.type(input, "My preserved draft");
    // A background cache refresh must not silently advance the edit session's version.
    act(() => client.setQueryData(companyKeys.detail("company-001"), { ...companies[0], version: 2 }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("heading", { name: "This company has changed" })).toBeInTheDocument();
    expect(input).toHaveValue("My preserved draft");
    expect(patches).toHaveLength(1);
    expect(patches[0].if_version).toBe(1);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Reload latest and keep my edits" }));
    await screen.findByRole("heading", { name: "Review your changes" });
    expect(input).toHaveValue("My preserved draft");
    expect(screen.getByLabelText("Domain optional")).toHaveValue("latest.com");
    expect(screen.getByLabelText("Status", { selector: "select" })).toHaveValue("contacted");
    expect(patches).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Save reviewed changes" }));
    await screen.findByText("Company saved successfully.");
    expect(patches[1]).toMatchObject({ if_version: 2, name: "My preserved draft", domain: "latest.com", status: "contacted" });
    expect(client.getQueryData<Company>(companyKeys.detail("company-001"))?.version).toBe(3);
    await screen.findByRole("button", { name: "My preserved draft" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("validates create locally and displays API 422 errors without losing input", async () => {
    const user = userEvent.setup();
    let creates = 0;
    server.use(http.post(origin, () => { creates++; return HttpResponse.json({ code: "validation_failed", message: "Invalid", fields: { name: ["invalid"] } }, { status: 422 }); }));
    renderFeature();
    await user.click(await screen.findByRole("button", { name: "Create company" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Create company" }));
    expect(await screen.findByText("Enter a company name.")).toBeInTheDocument();
    expect(creates).toBe(0);
    await user.type(screen.getByRole("textbox", { name: "Company name" }), "Valid draft");
    await user.click(within(dialog).getByRole("button", { name: "Create company" }));
    await screen.findByText("Check this value.");
    expect(screen.getByRole("textbox", { name: "Company name" })).toHaveValue("Valid draft");
    expect(creates).toBe(1);
  });

  it("loads a shared drawer link and handles missing records independently", async () => {
    originalReplace(null, "", "/companies?company=missing&q=Acme");
    renderFeature();
    expect(await screen.findByRole("heading", { name: "Company not found" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Acme Studio" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close drawer" }));
    expect(window.location.search).toBe("?q=Acme");
  });

  it("clears company data and redirects once when the API responds 401", async () => {
    server.use(http.get(origin, () => HttpResponse.json({ code: "unauthorized", message: "Sign in" }, { status: 401 })));
    const client = renderFeature();
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/sign-in?next=%2Fcompanies"));
    expect(sessionStorage.getItem("nordin-demo-token")).toBeNull();
    expect(navigation.replace).toHaveBeenCalledTimes(1);
    expect(client.getQueriesData({ queryKey: companyKeys.all }).every(([, data]) => data === undefined)).toBe(true);
  });

  it("offers language switching inside the modal and preserves edits when server messages refresh", async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    function feature(locale: "en" | "nl") {
      const dictionary = locale === "en" ? messages : dutchMessages;
      return <QueryClientProvider client={client}><LocaleProvider locale={locale} messages={dictionary}><AuthProvider>
        <CompaniesScreen heading={<h1>{dictionary.companies}</h1>} />
      </AuthProvider></LocaleProvider></QueryClientProvider>;
    }
    const view = render(feature("en"));
    await user.click(await screen.findByRole("button", { name: "Acme Studio" }));
    const input = await screen.findByRole("textbox", { name: "Company name" });
    await user.clear(input);
    await user.type(input, "Keep my draft");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "NL" }));
    expect(navigation.refresh).toHaveBeenCalled();
    expect(document.cookie).toContain("locale=nl");
    view.rerender(feature("nl"));
    expect(screen.getByRole("textbox", { name: "Bedrijfsnaam" })).toBe(input);
    expect(input).toHaveValue("Keep my draft");
    expect(screen.getByRole("button", { name: "Wijzigingen opslaan" })).toBeInTheDocument();
  });

  it("wraps keyboard focus in both directions inside the drawer", async () => {
    const user = userEvent.setup();
    renderFeature();
    await user.click(await screen.findByRole("button", { name: "Acme Studio" }));
    const save = await screen.findByRole("button", { name: "Save changes" });
    const close = screen.getByRole("button", { name: "Close drawer" });
    save.focus();
    expect(save).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(save).toHaveFocus();
  });
});
