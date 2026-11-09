import { sortSchema, statusSchema, type CompanySort, type CompanyStatus } from "./contracts";

export function parseCompanyUrl(search: Pick<URLSearchParams, "get">) {
  const parsedStatus = statusSchema.safeParse(search.get("status"));
  const parsedSort = sortSchema.safeParse(search.get("sort"));
  const requestedPage = Number(search.get("page") ?? "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 && requestedPage <= Math.floor(Number.MAX_SAFE_INTEGER / 20)
    ? requestedPage : 1;
  const companyId = search.get("company") || null;
  return {
    page, params: {
      q: (search.get("q") ?? "").trim(), status: parsedStatus.success ? parsedStatus.data : undefined,
      sort: parsedSort.success ? parsedSort.data : "name" as const, limit: 20, offset: (page - 1) * 20,
    },
    drawer: companyId ? { mode: "edit" as const, id: companyId }
      : search.get("drawer") === "create" ? { mode: "create" as const } : null,
  };
}
export type CompanyUrlPatch = {
  q?: string; status?: CompanyStatus | ""; sort?: CompanySort; page?: number;
  company?: string | null; drawer?: "create" | null;
};
export function updateCompanyUrl(current: string, patch: CompanyUrlPatch) {
  const search = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === "" || value === undefined) search.delete(key);
    else search.set(key, String(value));
  }
  if (patch.company) search.delete("drawer");
  if (patch.drawer) search.delete("company");
  return `/companies${search.size ? `?${search}` : ""}`;
}
export function navigateCompanies(patch: CompanyUrlPatch, replace = false) {
  const url = updateCompanyUrl(window.location.search, patch);
  if (`${window.location.pathname}${window.location.search}` !== url) {
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
  }
}
