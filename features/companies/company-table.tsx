"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Building2, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import type { Company, CompanyList, CompanySort } from "./contracts";
import { useLocale } from "@/lib/i18n/provider";
import { dateLocale, formatDate } from "@/lib/i18n/types";

export function StatusBadge({ status }: { status: Company["status"] }) {
  const { messages: m } = useLocale();
  return <span className={`status-badge status-${status}`}><span aria-hidden="true" />{m[status]}</span>;
}

type Props = {
  data?: CompanyList; loading: boolean; updating: boolean; error: boolean; stale: boolean;
  page: number; sort: CompanySort; filtered: boolean;
  onRetry: () => void; onOpen: (id: string) => void; onCreate: () => void;
  onSort: (sort: CompanySort) => void; onPage: (page: number) => void; onClear: () => void;
};
export function CompanyTable(props: Props) {
  const { data, loading, updating, error, stale, page, sort, filtered, onRetry, onOpen, onCreate, onSort, onPage, onClear } = props;
  const { messages: m, locale } = useLocale();
  const number = new Intl.NumberFormat(dateLocale(locale));
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / 20));
  const outOfRange = !items.length && page > 1;
  function sortHeader(field: "name" | "created_at", label: string) {
    const active = sort === field || sort === `-${field}`;
    const Icon = active ? (sort.startsWith("-") ? ArrowDown : ArrowUp) : ArrowUpDown;
    return <th scope="col" aria-sort={active ? sort.startsWith("-") ? "descending" : "ascending" : "none"}>
      <button type="button" className={`sort-button ${active ? "sorted" : ""}`} onClick={() => onSort(sort === field ? `-${field}` : field)} aria-label={`${m.sortBy} ${label}`}>
        {label}<Icon size={13} aria-hidden="true" />
      </button></th>;
  }
  return <>
    <div className="table-feedback" aria-live="polite" role="status">{updating ? m.updating : stale ? m.stale : ""}</div>
    {error && <div className="inline-error" role="alert"><span>{m.listError} {data ? m.stale : ""}</span><button className="text-button" onClick={onRetry}>{m.retry}</button></div>}
    <div className="table-scroll"><table className="company-table" aria-label={m.companyCount} aria-busy={loading || updating}>
      <thead><tr>{sortHeader("name", m.company)}<th scope="col">{m.domain}</th><th scope="col">{m.status}</th>{sortHeader("created_at", m.created)}<th scope="col"><span className="sr-only">{m.openCompany}</span></th></tr></thead>
      <tbody>
        {loading && !data ? Array.from({ length: 8 }, (_, index) => <tr className="skeleton-row" key={index}><td><span className="skeleton skeleton-company" /></td><td><span className="skeleton" /></td><td><span className="skeleton skeleton-status" /></td><td><span className="skeleton" /></td><td /></tr>) : items.map((company) => <tr key={company.id} onClick={(event) => { if (!(event.target instanceof Element && event.target.closest("button"))) onOpen(company.id); }}>
          <td><button className="company-name" onClick={() => onOpen(company.id)}><span className={`company-avatar tone-${company.name.charCodeAt(0) % 5}`} aria-hidden="true">{company.name.split(" ").slice(0, 2).map((part) => part[0]).join("")}</span><span>{company.name}</span></button></td>
          <td className="domain-cell">{company.domain || <span className="missing-value">—<span className="sr-only">{m.noDomain}</span></span>}</td>
          <td><StatusBadge status={company.status} /></td><td className="date-cell"><time dateTime={company.created_at}>{formatDate(company.created_at, locale)}</time></td><td className="row-chevron"><ChevronRight size={15} aria-hidden="true" /></td>
        </tr>)}
        {!loading && !items.length && !error && <tr><td colSpan={5}><div className="empty-state"><span className="empty-icon">{filtered ? <SearchX size={25} /> : <Building2 size={25} />}</span>
          <h2>{outOfRange ? m.outOfRange : filtered ? m.noMatches : m.emptyTitle}</h2><p>{outOfRange ? m.firstPage : filtered ? m.noMatchesDescription : m.emptyDescription}</p>
          <button className="button button-secondary" onClick={outOfRange ? () => onPage(1) : filtered ? onClear : onCreate}>{outOfRange ? m.firstPage : filtered ? m.clearFilters : m.create}</button>
        </div></td></tr>}
      </tbody>
    </table></div>
    {loading && !data && <span className="sr-only" role="status">{m.loading}</span>}
    <div className="table-footer"><p>{m.showing} <strong>{number.format(items.length ? (data?.offset ?? 0) + 1 : 0)}–{number.format((data?.offset ?? 0) + items.length)}</strong> {m.of} <strong>{number.format(total)}</strong> {m.results}</p>
      <nav className="pagination" aria-label={m.page}><span>{m.page} {number.format(page)} {m.of} {number.format(pages)}</span>
        <button className="pagination-button" aria-label={m.previous} disabled={page <= 1 || updating || loading} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /></button>
        <button className="pagination-button" aria-label={m.next} disabled={page >= pages || updating || loading || !items.length} onClick={() => onPage(page + 1)}><ChevronRight size={16} /></button>
      </nav>
    </div>
  </>;
}
