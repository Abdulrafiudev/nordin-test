"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/provider";
import { useLocale } from "@/lib/i18n/provider";
import { ApiError } from "./api";
import { formSchema, statuses, type Company, type CompanyDraft } from "./contracts";
import { companyKeys, companyOptions } from "./queries";

function draftFrom(company: Company | null): CompanyDraft {
  return { name: company?.name ?? "", domain: company?.domain ?? null, status: company?.status ?? "new" };
}
function reapplyDraft(latest: Company, baseline: Company, draft: CompanyDraft): CompanyDraft {
  return {
    name: draft.name !== baseline.name ? draft.name : latest.name,
    domain: draft.domain !== baseline.domain ? draft.domain : latest.domain,
    status: draft.status !== baseline.status ? draft.status : latest.status,
  };
}
type FieldErrors = Partial<Record<keyof CompanyDraft, "required" | "invalid">>;
type Props = { company: Company | null; onClose: () => void; onSaved: (created: boolean) => void };

export function CompanyForm({ company, onClose, onSaved }: Props) {
  const { api } = useAuth();
  const { messages: m } = useLocale();
  const queryClient = useQueryClient();
  const [baseline, setBaseline] = useState(company);
  const [draft, setDraft] = useState(() => draftFrom(company));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [conflictDraft, setConflictDraft] = useState<CompanyDraft | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const save = useMutation({
    mutationFn: ({ values, opened }: { values: CompanyDraft; opened: Company | null }) => opened
      ? api.updateCompany(opened.id, { ...values, if_version: opened.version }) : api.createCompany(values),
    onSuccess: async (saved, variables) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.all });
      queryClient.setQueryData(companyKeys.detail(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: companyKeys.lists });
      if (mounted.current) onSaved(!variables.opened);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409 && baseline) {
        setConflictDraft({ ...draft });
        setConflicted(true);
        setReviewing(false);
        void queryClient.invalidateQueries({ queryKey: companyKeys.detail(baseline.id), refetchType: "none" });
        void queryClient.invalidateQueries({ queryKey: companyKeys.lists });
      } else if (error instanceof ApiError && error.status === 422) {
        const errors: FieldErrors = {};
        for (const key of ["name", "domain", "status"] as const) {
          if (error.problem.fields?.[key]) errors[key] = error.problem.fields[key].includes("required") ? "required" : "invalid";
        }
        setFieldErrors(errors);
        if (errors.name) nameInput.current?.focus();
      }
    },
  });
  const reload = useMutation({
    mutationFn: async (opened: Company) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.detail(opened.id) });
      return queryClient.fetchQuery({ ...companyOptions(opened.id, api), staleTime: 0 });
    },
    onSuccess: (latest, opened) => {
      setDraft((current) => reapplyDraft(latest, opened, current));
      setBaseline(latest);
      setConflicted(false);
      setReviewing(true);
      setFieldErrors({});
      save.reset();
    },
  });
  const pending = save.isPending || reload.isPending;
  const genericError = save.isError && !(save.error instanceof ApiError && save.error.status === 409);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  function errorFor(field: keyof CompanyDraft) {
    const error = fieldErrors[field];
    return error ? <p className="field-error" id={`${field}-error`}>{error === "required" && field === "name" ? m.required : m.invalid}</p> : null;
  }
  return <form className="company-form" noValidate onSubmit={(event) => {
    event.preventDefault();
    if (pending || conflicted) return;
    const result = formSchema.safeParse(draft);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "name") errors.name = "required";
        else if (issue.path[0] === "domain") errors.domain = "invalid";
        else if (issue.path[0] === "status") errors.status = "invalid";
      }
      setFieldErrors(errors);
      if (errors.name) nameInput.current?.focus();
      return;
    }
    setFieldErrors({});
    save.mutate({ values: result.data, opened: baseline });
  }}>
    <div className="drawer-body">
      {conflicted && <div className="conflict-panel" role="alert"><AlertCircle size={19} aria-hidden="true" /><div><h3>{m.conflictTitle}</h3><p>{m.conflictDescription}</p>
        <button type="button" className="button conflict-button" disabled={pending} onClick={() => { if (baseline) reload.mutate(baseline); }}><RefreshCw size={14} className={reload.isPending ? "spin" : ""} />{reload.isPending ? m.reloading : m.reloadLatest}</button>
        {reload.isError && <p className="field-error">{m.reloadError}</p>}
      </div></div>}
      {reviewing && reload.data && <div className="review-panel" role="status"><h3><Check size={16} />{m.reviewTitle}</h3><p>{m.reviewDescription}</p><details open><summary>{m.latestValues} · {m.version} {reload.data.version}</summary><dl>
        <dt>{m.name}</dt><dd>{reload.data.name}</dd><dt>{m.domain}</dt><dd>{reload.data.domain || m.noDomain}</dd><dt>{m.status}</dt><dd>{m[reload.data.status]}</dd>
      </dl></details></div>}
      {(genericError || hasFieldErrors) && <div className="inline-error form-summary" role="alert">{hasFieldErrors || (save.error instanceof ApiError && save.error.status === 422) ? m.validationSummary : m.saveError}</div>}
      <fieldset disabled={pending} className="form-fields">
        <div className="field"><label htmlFor="company-name">{m.name}<span className="required-marker" aria-hidden="true">*</span></label>
          <input ref={nameInput} id="company-name" name="name" required placeholder={m.namePlaceholder} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "name-error" : undefined} />{errorFor("name")}
        </div>
        <div className="field"><label htmlFor="company-domain">{m.domain}{" "}<span className="optional-label">{m.optional}</span></label>
          <input id="company-domain" name="domain" placeholder={m.domainPlaceholder} value={draft.domain ?? ""} onChange={(event) => setDraft({ ...draft, domain: event.target.value || null })} aria-invalid={Boolean(fieldErrors.domain)} aria-describedby={fieldErrors.domain ? "domain-error" : undefined} />{errorFor("domain")}
        </div>
        <div className="field"><label htmlFor="company-status">{m.status}</label><select id="company-status" name="status" value={draft.status} onChange={(event) => { const parsed = formSchema.shape.status.safeParse(event.target.value); if (parsed.success) setDraft({ ...draft, status: parsed.data }); }} aria-invalid={Boolean(fieldErrors.status)} aria-describedby={fieldErrors.status ? "status-error" : undefined}>
          {statuses.map((status) => <option key={status} value={status}>{m[status]}</option>)}
        </select>{errorFor("status")}</div>
      </fieldset>
      {conflictDraft && <span className="sr-only">{m.reviewTitle}: {conflictDraft.name}, {conflictDraft.domain || m.noDomain}, {m[conflictDraft.status]}</span>}
    </div>
    <div className="drawer-footer"><button type="button" className="button button-secondary" onClick={onClose}>{m.cancel}</button><button type="submit" className="button button-primary" disabled={pending || conflicted}>
      {save.isPending ? m.saving : reviewing ? m.saveReviewed : baseline ? m.save : m.create}
    </button></div>
  </form>;
}
