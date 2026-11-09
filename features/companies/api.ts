import { z } from "zod";
import { companyListSchema, companySchema, problemSchema, type ApiProblem, type CreateCompanyInput, type ListCompaniesParams, type UpdateCompanyInput } from "./contracts";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly problem: ApiProblem) {
    super(problem.message);
    this.name = "ApiError";
  }
}

type ClientConfig = {
  getToken: () => string | null | Promise<string | null>;
  onUnauthorized: () => void;
  baseUrl?: string;
};

export function createCompaniesClient({ getToken, onUnauthorized, baseUrl = typeof window === "undefined" ? "" : window.location.origin }: ClientConfig) {
  async function request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const headers = new Headers(options.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body) headers.set("Content-Type", "application/json");
    const response = await fetch(`${baseUrl}/api/v1/companies${path}`, {
      ...options, headers, cache: "no-store",
    });
    if (response.status === 401) onUnauthorized();
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const problem = problemSchema.safeParse(body);
      throw new ApiError(response.status, problem.success ? problem.data : {
        code: "request_failed", message: `Request failed (${response.status}).`,
      });
    }
    const result = schema.safeParse(body);
    if (!result.success) throw new ApiError(502, { code: "invalid_response", message: "The server returned an invalid response." });
    return result.data;
  }
  return {
    listCompanies(params: ListCompaniesParams, signal?: AbortSignal) {
      const search = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset), sort: params.sort });
      if (params.q) search.set("q", params.q);
      if (params.status) search.set("status", params.status);
      return request(`?${search}`, companyListSchema, { signal });
    },
    getCompany(id: string, signal?: AbortSignal) {
      return request(`/${encodeURIComponent(id)}`, companySchema, { signal });
    },
    createCompany(input: CreateCompanyInput) {
      return request("", companySchema, { method: "POST", body: JSON.stringify(input) });
    },
    updateCompany(id: string, input: UpdateCompanyInput) {
      return request(`/${encodeURIComponent(id)}`, companySchema, { method: "PATCH", body: JSON.stringify(input) });
    },
  };
}
export type CompaniesClient = ReturnType<typeof createCompaniesClient>;
