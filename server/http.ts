import "server-only";
import { z } from "zod";
import type { ApiProblem } from "@/features/companies/contracts";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function problem(status: number, code: string, message: string, fields?: ApiProblem["fields"]) {
  return json({ code, message, ...(fields && { fields }) } satisfies ApiProblem, status);
}
export async function authorize(request: Request) {
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.floor(Math.random() * 501)));
  if (!/^Bearer\s+\S+$/i.test(request.headers.get("Authorization") ?? "")) {
    return problem(401, "unauthorized", "A bearer token is required.");
  }
}
export function validationProblem(error: z.ZodError) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    (fields[key] ??= []).push(issue.message === "required" ? "required" : "invalid");
  }
  return problem(422, "validation_failed", "Check the supplied values.", fields);
}
export async function readBody(request: Request): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  try { const data: unknown = await request.json(); return { ok: true, data }; }
  catch { return { ok: false, response: problem(400, "invalid_json", "The body must be valid JSON.") }; }
}
