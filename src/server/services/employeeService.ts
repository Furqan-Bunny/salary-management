import { z, type ZodTypeAny } from "zod";
import { changePercent } from "../domain/compensation";
import { COUNTRY_CODES } from "../domain/countries";
import { employeeCreateSchema, employeeUpdateSchema, salaryChangeSchema } from "../domain/schemas";
import type { Employee, EmployeeRepository, EmployeeStatus, ListQuery, Page, SalaryChange } from "../repositories/employeeRepository";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

const optionalText = z.string().trim().max(120).optional().transform((s) => s || undefined);

// Query params come from URLs people bookmark, so anything invalid falls back to a default instead of failing.
const filtersSchema = z.object({
  search: optionalText,
  country: z.enum(COUNTRY_CODES).optional().catch(undefined),
  department: optionalText,
  jobTitle: optionalText,
  status: z
    .enum(["active", "inactive", "all"])
    .catch("active")
    .default("active")
    .transform((s) => (s === "all" ? undefined : s)),
  band: z.enum(["below", "within", "above", "none"]).optional().catch(undefined),
  sort: z.enum(["name", "salary", "compa", "hireDate"]).optional().catch(undefined),
  order: z.enum(["asc", "desc"]).optional().catch(undefined),
});

const listSchema = filtersSchema.extend({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(25),
});

const CSV_COLUMNS: [string, (e: Employee) => string | number | null][] = [
  ["Employee code", (e) => e.employeeCode],
  ["Full name", (e) => e.fullName],
  ["Email", (e) => e.email],
  ["Job title", (e) => e.jobTitle],
  ["Department", (e) => e.department],
  ["Country", (e) => e.country],
  ["Currency", (e) => e.currency],
  ["Gender", (e) => e.gender],
  ["Hire date", (e) => e.hireDate],
  ["Status", (e) => e.status],
  ["Salary", (e) => e.salary],
  ["Band min", (e) => e.band?.min ?? null],
  ["Band mid", (e) => e.band?.mid ?? null],
  ["Band max", (e) => e.band?.max ?? null],
  ["Compa-ratio", (e) => e.compaRatio],
  ["Band position", (e) => e.bandPosition],
];

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  // A leading = + - @ makes Excel evaluate the cell as a formula; prefix it so exported data stays data.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function parse<S extends ZodTypeAny>(schema: S, raw: unknown): z.infer<S> {
  const result = schema.safeParse(raw);
  if (!result.success) throw ValidationError.fromZod(result.error);
  return result.data;
}

export interface SalaryChangeResult {
  employee: Employee;
  previousSalary: number;
  changePercent: number;
}

export class EmployeeService {
  constructor(private readonly repo: EmployeeRepository) {}

  list(raw: Record<string, unknown>): Page<Employee> {
    return this.repo.list(listSchema.parse(raw) as ListQuery);
  }

  exportCsv(raw: Record<string, unknown>): string {
    const filters = filtersSchema.parse(raw) as Omit<ListQuery, "page" | "pageSize">;
    const lines = [CSV_COLUMNS.map(([h]) => h).join(",")];
    for (const e of this.repo.iterate(filters)) lines.push(CSV_COLUMNS.map(([, get]) => csvCell(get(e))).join(","));
    return lines.join("\n") + "\n";
  }

  get(id: number): Employee {
    const employee = this.repo.findById(id);
    if (!employee) throw new NotFoundError("Employee");
    return employee;
  }

  history(id: number): SalaryChange[] {
    this.get(id);
    return this.repo.history(id);
  }

  create(raw: unknown): Employee {
    const input = parse(employeeCreateSchema, raw);
    if (this.repo.emailTaken(input.email)) throw new ValidationError({ email: "Another employee already uses this email" });
    return this.repo.transaction(() => {
      const employee = this.repo.create(input);
      this.repo.addSalaryChange({
        employeeId: employee.id,
        previousSalary: null,
        newSalary: input.salary,
        effectiveDate: input.hireDate,
        reason: "hire",
      });
      return employee;
    });
  }

  updateProfile(id: number, raw: unknown): Employee {
    const { version, ...profile } = parse(employeeUpdateSchema, raw);
    if (this.repo.emailTaken(profile.email, id)) throw new ValidationError({ email: "Another employee already uses this email" });
    const result = this.repo.updateProfile(id, profile, version);
    if (result === "not_found") throw new NotFoundError("Employee");
    if (result === "conflict") {
      throw new ConflictError("Someone else changed this employee after you opened it. Reload to see their changes.");
    }
    return result;
  }

  changeSalary(id: number, raw: unknown): SalaryChangeResult {
    const input = parse(salaryChangeSchema, raw);
    const employee = this.get(id);
    if (employee.status === "inactive") throw new ConflictError("Reactivate this employee before changing their salary.");
    if (input.effectiveDate < employee.hireDate) {
      throw new ValidationError({ effectiveDate: `Effective date cannot be before the hire date (${employee.hireDate})` });
    }
    const last = this.repo.history(id)[0];
    if (last && input.effectiveDate < last.effectiveDate) {
      throw new ValidationError({ effectiveDate: `Effective date cannot be before the last change (${last.effectiveDate})` });
    }
    if (input.newSalary === employee.salary) {
      throw new ValidationError({ newSalary: "New salary is the same as the current salary" });
    }
    return this.repo.transaction(() => {
      this.repo.addSalaryChange({ employeeId: id, previousSalary: employee.salary, ...input });
      this.repo.setSalary(id, input.newSalary);
      return {
        employee: this.get(id),
        previousSalary: employee.salary,
        changePercent: changePercent(employee.salary, input.newSalary),
      };
    });
  }

  setStatus(id: number, status: EmployeeStatus): Employee {
    if (!this.repo.setStatus(id, status)) throw new NotFoundError("Employee");
    return this.get(id);
  }

  options() {
    return { jobTitles: this.repo.distinct("job_title"), departments: this.repo.distinct("department") };
  }
}
