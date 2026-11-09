import "server-only";
import type { Company, CreateCompanyInput, ListCompaniesParams, UpdateCompanyInput } from "@/features/companies/contracts";
import { statuses } from "@/features/companies/contracts";

const names = [
  "Acme Studio", "Aether Labs", "Amber Collective", "Atlas Ventures", "Bloom Health",
  "Boreal Energy", "Brightside", "Canopy Works", "Cedar Finance", "Cirrus Cloud",
  "Cobalt Systems", "Copper & Co", "Daybreak Media", "Delta Logistics", "Evergreen",
  "Fieldwork", "Finch Analytics", "Flux Digital", "Forma Design", "Gather Foods",
  "Harbor Technologies", "Helix Bio", "Juniper Group", "Kindred Coffee", "Lighthouse",
  "Linear Motion", "Lumina Solar", "Meadow Market", "Northstar", "Oak & Stone",
  "Orbit Commerce", "Paperplane", "Pioneer Robotics", "Quartz Capital", "Riverbank",
  "Sage Software", "Summit Supply", "Tandem Mobility", "Verve Creative", "Willow Partners",
];

export function seedCompanies(): Company[] {
  return names.map((name, index) => {
    const timestamp = new Date(Date.UTC(2026, 9, 1 + index)).toISOString();
    return {
      id: `company-${String(index + 1).padStart(3, "0")}`, name,
      domain: index % 9 === 8 ? null : `${name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
      status: statuses[index % statuses.length], version: 1,
      created_at: timestamp, updated_at: timestamp,
    };
  });
}

// A process-global array also survives dev module reloads. It is deliberately not durable.
const processState = globalThis as typeof globalThis & { companiesStore?: Company[] };
function records() { return processState.companiesStore ??= seedCompanies(); }

export function listCompanies(params: ListCompaniesParams) {
  const q = params.q.toLowerCase();
  const filtered = records().filter((company) =>
    (!params.status || company.status === params.status) &&
    (!q || company.name.toLowerCase().includes(q) || company.domain?.toLowerCase().includes(q)),
  );
  const descending = params.sort.startsWith("-");
  const field = params.sort.includes("created_at") ? "created_at" : "name";
  filtered.sort((a, b) => {
    const comparison = a[field].localeCompare(b[field], "en");
    return (descending ? -comparison : comparison) || a.id.localeCompare(b.id);
  });
  return { items: filtered.slice(params.offset, params.offset + params.limit).map((item) => ({ ...item })),
    total: filtered.length, limit: params.limit, offset: params.offset };
}

export function getCompany(id: string) { const company = records().find((record) => record.id === id); return company ? { ...company } : undefined; }

export function createCompany(input: CreateCompanyInput): Company {
  const timestamp = new Date().toISOString();
  const company: Company = {
    id: crypto.randomUUID(), name: input.name.trim(), domain: input.domain?.trim() || null,
    status: input.status ?? "new", version: 1, created_at: timestamp, updated_at: timestamp,
  };
  records().push(company);
  return { ...company };
}

export function updateCompany(id: string, input: UpdateCompanyInput):
  { kind: "missing" } | { kind: "conflict" } | { kind: "updated"; company: Company } {
  // No await between this read, compare and write: atomic within this single process.
  const index = records().findIndex((company) => company.id === id);
  if (index < 0) return { kind: "missing" };
  const current = records()[index];
  if (current.version !== input.if_version) return { kind: "conflict" };
  const company: Company = {
    ...current,
    ...(input.name !== undefined && { name: input.name.trim() }),
    ...(input.domain !== undefined && { domain: input.domain?.trim() || null }),
    ...(input.status !== undefined && { status: input.status }),
    version: current.version + 1, updated_at: new Date().toISOString(),
  };
  records()[index] = company;
  return { kind: "updated", company: { ...company } };
}
