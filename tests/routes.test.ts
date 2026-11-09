import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as list, POST } from "@/app/api/v1/companies/route";
import { GET as detail, PATCH } from "@/app/api/v1/companies/[id]/route";
import { companyListSchema, companySchema, type Company } from "@/features/companies/contracts";

const base = "http://localhost:3000/api/v1/companies";
const context = (id = "company-001") => ({ params: Promise.resolve({ id }) });
function req(path = "", method = "GET", body?: unknown, auth = true) {
  return new Request(`${base}${path}`, { method, headers: auth ? { Authorization: "Bearer test" } : {}, ...(body !== undefined && { body: typeof body === "string" ? body : JSON.stringify(body) }) });
}
async function complete<T>(promise: Promise<T>): Promise<T> { await vi.runAllTimersAsync(); return promise; }
beforeEach(() => {
  (globalThis as typeof globalThis & { companiesStore?: Company[] }).companiesStore = undefined;
  vi.useFakeTimers();
});
describe("company Route Handler contract", () => {
  it("seeds 40 records, pages 20 at a time and calculates total before slicing", async () => {
    const first = await complete(list(req()));
    const second = await complete(list(req("?limit=20&offset=20")));
    const a = companyListSchema.parse(await first.json());
    const b = companyListSchema.parse(await second.json());
    expect(a).toMatchObject({ total: 40, limit: 20, offset: 0 });
    expect(a.items).toHaveLength(20);
    expect(b.items).toHaveLength(20);
    expect(new Set([...a.items, ...b.items].map((item) => item.id)).size).toBe(40);
    expect(first.headers.get("Cache-Control")).toBe("no-store");
  });
  it("searches names and domains case-insensitively with a status filter", async () => {
    const response = await complete(list(req("?q=ACMESTUDIO.COM&status=new")));
    const data = companyListSchema.parse(await response.json());
    expect(data.total).toBe(1);
    expect(data.items[0].name).toBe("Acme Studio");
    expect(companyListSchema.parse(await (await complete(list(req("?q=nomatches")))).json()).total).toBe(0);
  });
  it.each(["name", "-name", "created_at", "-created_at"])("sorts %s before pagination", async (sort) => {
    const response = await complete(list(req(`?sort=${sort}&limit=40`)));
    const { items } = companyListSchema.parse(await response.json());
    const field = sort.includes("created_at") ? "created_at" : "name";
    const expected = [...items].sort((a, b) => (sort.startsWith("-") ? -1 : 1) * a[field].localeCompare(b[field], "en"));
    expect(items.map((item) => item.id)).toEqual(expected.map((item) => item.id));
  });
  it.each(["?limit=0", "?offset=-1", "?status=wrong", "?sort=wrong", "?offset=1.5"])("rejects invalid parameters %s", async (query) => {
    expect((await complete(list(req(query)))).status).toBe(422);
  });
  it("requires bearer auth on all four operations", async () => {
    for (const promise of [list(req("", "GET", undefined, false)), POST(req("", "POST", { name: "Test" }, false)), detail(req("/company-001", "GET", undefined, false), context()), PATCH(req("/company-001", "PATCH", { if_version: 1 }, false), context())]) {
      expect((await complete(promise)).status).toBe(401);
    }
  });
  it("creates v1, normalizes optional domain and validates whitespace names", async () => {
    const response = await complete(POST(req("", "POST", { name: "  Test company  ", domain: " " })));
    expect(response.status).toBe(201);
    expect(companySchema.parse(await response.json())).toMatchObject({ name: "Test company", version: 1, status: "new", domain: null });
    expect((await complete(POST(req("", "POST", { name: "   " })))).status).toBe(422);
    expect((await complete(PATCH(req("/company-001", "PATCH", { name: " ", if_version: 1 }), context()))).status).toBe(422);
    expect((await complete(POST(req("", "POST", "{broken")))).status).toBe(400);
  });
  it("allows exactly one of two concurrent updates with the same version", async () => {
    const responses = await complete(Promise.all([
      PATCH(req("/company-001", "PATCH", { if_version: 1, name: "First" }), context()),
      PATCH(req("/company-001", "PATCH", { if_version: 1, name: "Second" }), context()),
    ]));
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const current = companySchema.parse(await (await complete(detail(req("/company-001"), context()))).json());
    expect(current.version).toBe(2);
    expect(current.created_at).toBe("2026-10-01T00:00:00.000Z");
  });
  it("returns 404 for missing detail and update; rejects missing version", async () => {
    expect((await complete(detail(req("/missing"), context("missing")))).status).toBe(404);
    expect((await complete(PATCH(req("/missing", "PATCH", { if_version: 1 }), context("missing")))).status).toBe(404);
    expect((await complete(PATCH(req("/company-001", "PATCH", { name: "No version" }), context()))).status).toBe(422);
  });
  it.each([0, .999999])("delays even unauthorized requests by 300-800ms (%s)", async (random) => {
    vi.spyOn(Math, "random").mockReturnValue(random);
    const start = Date.now();
    const response = await complete(list(req("", "GET", undefined, false)));
    expect(response.status).toBe(401);
    expect(Date.now() - start).toBe(random === 0 ? 300 : 800);
  });
});
