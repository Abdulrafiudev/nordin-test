"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, X } from "lucide-react";
import { useAuth } from "@/lib/auth/provider";
import { useLocale } from "@/lib/i18n/provider";
import { companyKeys, listCompaniesOptions } from "./queries";
import { navigateCompanies, parseCompanyUrl } from "./url-state";
import { statuses, statusSchema, type CompanyList } from "./contracts";
import { CompanyTable } from "./company-table";
import { CompanyDrawer } from "./company-drawer";

export function CompaniesScreen({ heading }: { heading: React.ReactNode }) {
  const { ready, signedIn, redirecting, api } = useAuth();
  const { messages: m } = useLocale();
  const router = useRouter();
  const search = useSearchParams();
  const { params, page, drawer } = parseCompanyUrl(search);
  const [notice, setNotice] = useState("");
  const queryClient = useQueryClient();
  const query = useQuery({ ...listCompaniesOptions(params, api), enabled: ready && signedIn });
  useEffect(() => {
    if (ready && !signedIn && !redirecting) router.replace(`/sign-in?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
  }, [ready, signedIn, redirecting, router]);
  // Fall back to the last successful cached list after a failed filter request. It is visibly labelled.
  const previous = query.isError ? queryClient.getQueryCache().findAll({ queryKey: companyKeys.lists })
    .filter((entry) => entry.state.data !== undefined).sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)[0] : undefined;
  const data = query.data ?? (previous ? queryClient.getQueryData<CompanyList>(previous.queryKey) : undefined);
  const openCreate = () => navigateCompanies({ drawer: "create", company: null });
  const clear = () => navigateCompanies({ q: "", status: "", page: 1 });
  return <>
    <div className="page-heading"><div>{heading}</div><button className="button button-primary" disabled={!ready || !signedIn} onClick={openCreate}><Plus size={17} />{m.create}</button></div>
    <div role="status" className={notice ? "success-notice" : "sr-only"}>{notice}</div>
    <section className="directory-card" aria-label={m.companies}>
      <div className="directory-toolbar"><SearchForm key={params.q} initial={params.q} />
        <div className="filter-controls"><label className="sr-only" htmlFor="status-filter">{m.filterStatus}</label>
          <span className="filter-label">{m.status}</span><select id="status-filter" value={params.status ?? ""} onChange={(event) => {
            const result = statusSchema.safeParse(event.target.value);
            navigateCompanies({ status: result.success ? result.data : "", page: 1 });
          }}><option value="">{m.allStatuses}</option>{statuses.map((status) => <option key={status} value={status}>{m[status]}</option>)}</select>
          {(params.q || params.status) && <button className="icon-button" onClick={clear} aria-label={m.clearFilters}><X size={17} /></button>}
        </div>
      </div>
      <CompanyTable data={data} loading={query.isPending} updating={query.isFetching && Boolean(data)} error={query.isError} stale={Boolean(previous) || query.isPlaceholderData}
        page={page} sort={params.sort} filtered={Boolean(params.q || params.status)} onRetry={() => { void query.refetch(); }}
        onOpen={(id) => navigateCompanies({ company: id, drawer: null })} onCreate={openCreate}
        onSort={(sort) => navigateCompanies({ sort, page: 1 })} onPage={(page) => navigateCompanies({ page })} onClear={clear} />
    </section>
    {drawer && signedIn && <CompanyDrawer key={drawer.mode === "edit" ? drawer.id : "create"} drawer={drawer}
      onClose={() => navigateCompanies({ company: null, drawer: null }, true)}
      onSaved={(created) => { setNotice(created ? m.createdSuccess : m.saved); navigateCompanies({ company: null, drawer: null }, true); }} />}
  </>;
}

function SearchForm({ initial }: { initial: string }) {
  const { messages: m } = useLocale();
  const [value, setValue] = useState(initial);
  return <form className="search-form" role="search" onSubmit={(event) => { event.preventDefault(); navigateCompanies({ q: value.trim(), page: 1 }); }}>
    <label className="sr-only" htmlFor="company-search">{m.searchLabel}</label><Search size={17} aria-hidden="true" /><input id="company-search" type="search" placeholder={m.searchPlaceholder} value={value} onChange={(event) => setValue(event.target.value)} />
    <button type="submit" className="search-submit">{m.search}</button>
  </form>;
}
