import { describe, expect, it } from "vitest";
import { parseCompanyUrl, updateCompanyUrl } from "@/features/companies/url-state";
import { companyKeys } from "@/features/companies/queries";
import { safeReturnPath } from "@/lib/auth/provider";

describe("URL state and query keys", () => {
  const parse = (search: string) => parseCompanyUrl(new URLSearchParams(search));
  it("normalizes invalid values and equivalent defaults to the same key", () => {
    const base = parse("");
    expect(companyKeys.list(base.params)).toEqual(companyKeys.list(parse("page=nope&sort=invalid&status=all").params));
    expect(parse("page=-2").page).toBe(1);
    expect(parse("page=1.5").page).toBe(1);
    expect(parse("page=1e30").page).toBe(1);
    expect(parse("page=2").params).toMatchObject({ limit: 20, offset: 20 });
  });
  it.each(["q=Acme", "status=new", "sort=-name", "sort=created_at", "page=2"])("includes %s in the list identity", (search) => {
    expect(companyKeys.list(parse(search).params)).not.toEqual(companyKeys.list(parse("").params));
  });
  it("includes API limit independently and excludes drawer state", () => {
    const params = parse("").params;
    expect(companyKeys.list({ ...params, limit: 5 })).not.toEqual(companyKeys.list(params));
    expect(companyKeys.list(parse("company=company-001&drawer=create").params)).toEqual(companyKeys.list(params));
    expect(parse("company=company-001&drawer=create").drawer).toEqual({ mode: "edit", id: "company-001" });
  });
  it("preserves list parameters while opening and closing mutually exclusive drawers", () => {
    const url = updateCompanyUrl("q=oak&page=2&company=company-001", { drawer: "create" });
    expect(url).toBe("/companies?q=oak&page=2&drawer=create");
    expect(updateCompanyUrl(url.split("?")[1], { drawer: null, company: null })).toBe("/companies?q=oak&page=2");
  });
  it.each(["https://attacker.test/companies", "//attacker.test", "/sign-in", "javascript:alert(1)"])("rejects unsafe return path %s", (path) => {
    expect(safeReturnPath(path)).toBe("/companies");
  });
  it("preserves safe drawer return paths", () => expect(safeReturnPath("/companies?company=company-001")).toBe("/companies?company=company-001"));
});
