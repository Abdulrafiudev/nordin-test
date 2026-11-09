import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { ApiError, type CompaniesClient } from "./api";
import type { ListCompaniesParams } from "./contracts";

export const companyKeys = {
  all: ["companies"] as const,
  lists: ["companies", "list"] as const,
  list: (params: ListCompaniesParams) => ["companies", "list", {
    q: params.q, status: params.status ?? null, sort: params.sort, limit: params.limit, offset: params.offset,
  }] as const,
  detail: (id: string) => ["companies", "detail", id] as const,
};
export function retryQuery(failures: number, error: Error) {
  return failures < 1 && (!(error instanceof ApiError) || error.status >= 500);
}
export function listCompaniesOptions(params: ListCompaniesParams, api: CompaniesClient) {
  return queryOptions({
    queryKey: companyKeys.list(params), queryFn: ({ signal }) => api.listCompanies(params, signal),
    staleTime: 30_000, placeholderData: keepPreviousData, retry: retryQuery,
  });
}
export function companyOptions(id: string, api: CompaniesClient) {
  return queryOptions({
    queryKey: companyKeys.detail(id), queryFn: ({ signal }) => api.getCompany(id, signal),
    staleTime: 30_000, retry: retryQuery,
  });
}
