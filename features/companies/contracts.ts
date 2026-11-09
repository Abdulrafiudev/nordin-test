import { z } from "zod";

export const statuses = ["new", "researching", "contacted", "qualified", "rejected"] as const;
export const sorts = ["name", "-name", "created_at", "-created_at"] as const;
export const statusSchema = z.enum(statuses);
export const sortSchema = z.enum(sorts);
const name = z.string().trim().min(1, "required");
const domain = z.union([z.string(), z.null()]).transform((value) => value?.trim() || null);

export const companySchema = z.object({
  id: z.string(), name: z.string(), domain: z.string().nullable(),
  status: statusSchema, version: z.number().int().positive(),
  created_at: z.iso.datetime(), updated_at: z.iso.datetime(),
});
export const createCompanySchema = z.object({
  name, domain: domain.optional(), status: statusSchema.optional(),
}).strict();
export const updateCompanySchema = z.object({
  if_version: z.number().int().positive(), name: name.optional(),
  domain: domain.optional(), status: statusSchema.optional(),
}).strict();
export const formSchema = z.object({ name, domain, status: statusSchema });
export const listParamsSchema = z.object({
  limit: z.coerce.number().int().positive().default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
  q: z.string().trim().default(""),
  status: statusSchema.optional(),
  sort: sortSchema.default("name"),
});
export const companyListSchema = z.object({
  items: z.array(companySchema), total: z.number().int().nonnegative(),
  limit: z.number().int().positive(), offset: z.number().int().nonnegative(),
});
export const problemSchema = z.object({
  code: z.string(), message: z.string(),
  fields: z.record(z.string(), z.array(z.string())).optional(),
});

export type Company = z.infer<typeof companySchema>;
export type CompanyStatus = z.infer<typeof statusSchema>;
export type CompanySort = z.infer<typeof sortSchema>;
export type CreateCompanyInput = z.input<typeof createCompanySchema>;
export type UpdateCompanyInput = z.input<typeof updateCompanySchema>;
export type CompanyDraft = z.infer<typeof formSchema>;
export type ListCompaniesParams = z.infer<typeof listParamsSchema>;
export type CompanyList = z.infer<typeof companyListSchema>;
export type ApiProblem = z.infer<typeof problemSchema>;
