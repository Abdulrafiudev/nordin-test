import { updateCompanySchema } from "@/features/companies/contracts";
import { getCompany, updateCompany } from "@/server/companies-store";
import { authorize, json, problem, readBody, validationProblem } from "@/server/http";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const denied = await authorize(request);
  if (denied) return denied;
  const { id } = await context.params;
  const company = getCompany(id);
  return company ? json(company) : problem(404, "not_found", "Company not found.");
}

export async function PATCH(request: Request, context: Context) {
  const denied = await authorize(request);
  if (denied) return denied;
  const { id } = await context.params;
  const body = await readBody(request);
  if (!body.ok) return body.response;
  const parsed = updateCompanySchema.safeParse(body.data);
  if (!parsed.success) return validationProblem(parsed.error);
  const result = updateCompany(id, parsed.data);
  if (result.kind === "missing") return problem(404, "not_found", "Company not found.");
  if (result.kind === "conflict") return problem(409, "version_conflict", "This company has changed. Reload the latest version.");
  return json(result.company);
}
