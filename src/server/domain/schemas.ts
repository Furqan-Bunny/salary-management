import { z } from "zod";
import { COUNTRY_CODES } from "./countries";

export const GENDERS = ["female", "male", "non_binary", "undisclosed"] as const;
export type Gender = (typeof GENDERS)[number];

export const CHANGE_REASONS = ["merit", "promotion", "market_adjustment", "correction"] as const;
export type ChangeReason = (typeof CHANGE_REASONS)[number] | "hire";

const text = (field: string, max: number) =>
  z
    .string({ required_error: `${field} is required`, invalid_type_error: `${field} is required` })
    .trim()
    .min(1, `${field} is required`)
    .max(max, `${field} must be at most ${max} characters`);

const money = (field: string) =>
  z.coerce
    .number({ invalid_type_error: `${field} must be a number` })
    .int(`${field} must be a whole number`)
    .positive(`${field} must be greater than zero`)
    .max(1_000_000_000, `${field} looks too large`);

const isoDate = (field: string) =>
  z
    .string({ required_error: `${field} is required`, invalid_type_error: `${field} is required` })
    .min(1, `${field} is required`)
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${field} must be YYYY-MM-DD`)
    .refine((d) => {
      const parsed = new Date(`${d}T00:00:00Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(d);
    }, `${field} is not a valid date`);

const today = () => new Date().toISOString().slice(0, 10);

const profile = {
  fullName: text("Full name", 120),
  email: text("Email", 254).toLowerCase().email("Email is not valid"),
  jobTitle: text("Job title", 80),
  department: text("Department", 80),
  country: z.enum(COUNTRY_CODES, { errorMap: () => ({ message: "Country is not supported" }) }),
  gender: z.enum(GENDERS).default("undisclosed"),
  hireDate: isoDate("Hire date").refine((d) => d <= today(), "Hire date cannot be in the future"),
};

/** New employee: profile plus the starting salary, which becomes the first history entry. */
export const employeeCreateSchema = z.object({ ...profile, salary: money("Salary") });

/** Profile edit. Salary is changed through salaryChangeSchema, never here. */
export const employeeUpdateSchema = z.object({
  ...profile,
  version: z.coerce.number({ required_error: "Version is required" }).int().nonnegative(),
});

export const salaryChangeSchema = z.object({
  newSalary: money("New salary"),
  effectiveDate: isoDate("Effective date"),
  reason: z.enum(CHANGE_REASONS, { errorMap: () => ({ message: "Choose a reason for the change" }) }),
  note: z.string().trim().max(500, "Note must be at most 500 characters").optional().transform((n) => n || undefined),
});

export const bandSchema = z
  .object({ min: money("Minimum"), mid: money("Midpoint"), max: money("Maximum") })
  .refine((b) => b.min < b.mid && b.mid < b.max, { message: "Band must satisfy minimum < midpoint < maximum", path: ["mid"] });

export type EmployeeCreate = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;
export type SalaryChangeInput = z.infer<typeof salaryChangeSchema>;
export type BandInput = z.infer<typeof bandSchema>;
