import { createCompanySchema, listParamsSchema } from "@/features/companies/contracts";
import { createCompany, listCompanies } from "@/server/companies-store";
import { authorize, json, readBody, validationProblem } from "@/server/http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  const parsed = listParamsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return validationProblem(parsed.error);
  return json(listCompanies(parsed.data));
}

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  const body = await readBody(request);
  if (!body.ok) return body.response;
  const parsed = createCompanySchema.safeParse(body.data);
  if (!parsed.success) return validationProblem(parsed.error);
  return json(createCompany(parsed.data), 201);
}
