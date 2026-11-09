import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { ApiError, createCompaniesClient } from "@/features/companies/api";
import { seedCompanies } from "@/server/companies-store";
import { server } from "./server";

const company = seedCompanies()[0];
describe("typed API client", () => {
  it("obtains a fresh bearer token for each request and serializes input", async () => {
    let token = "first";
    const seen: (string | null)[] = [];
    server.use(http.get("http://localhost:3000/api/v1/companies/:id", ({ request }) => {
      seen.push(request.headers.get("Authorization"));
      return HttpResponse.json(company);
    }));
    const api = createCompaniesClient({ getToken: () => token, onUnauthorized: vi.fn() });
    expect(await api.getCompany(company.id)).toEqual(company);
    token = "second";
    await api.getCompany(company.id);
    expect(seen).toEqual(["Bearer first", "Bearer second"]);
  });
  it("preserves 422 field errors", async () => {
    const fields = { name: ["required"] };
    server.use(http.post("http://localhost:3000/api/v1/companies", () => HttpResponse.json({ code: "validation_failed", message: "Invalid", fields }, { status: 422 })));
    const api = createCompaniesClient({ getToken: () => "demo", onUnauthorized: vi.fn() });
    await expect(api.createCompany({ name: "" })).rejects.toMatchObject({ status: 422, problem: { fields } });
  });
  it("notifies auth on 401 without retrying", async () => {
    const onUnauthorized = vi.fn();
    let requests = 0;
    server.use(http.get("http://localhost:3000/api/v1/companies/:id", () => { requests++; return HttpResponse.json({ code: "unauthorized", message: "Sign in" }, { status: 401 }); }));
    const api = createCompaniesClient({ getToken: () => null, onUnauthorized });
    await expect(api.getCompany("1")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(requests).toBe(1);
  });
  it("rejects malformed success responses instead of trusting a TypeScript cast", async () => {
    server.use(http.get("http://localhost:3000/api/v1/companies/:id", () => HttpResponse.json({ id: "1" })));
    const api = createCompaniesClient({ getToken: () => "demo", onUnauthorized: vi.fn() });
    await expect(api.getCompany("1")).rejects.toMatchObject({ status: 502, problem: { code: "invalid_response" } });
  });
});
