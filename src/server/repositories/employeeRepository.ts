import type { Db } from "../db/connection";
import { bandPosition, compaRatio, type Band, type BandPosition } from "../domain/compensation";
import { currencyOf, type CountryCode } from "../domain/countries";
import type { ChangeReason, EmployeeCreate, EmployeeUpdate, Gender } from "../domain/schemas";

export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  country: CountryCode;
  currency: string;
  gender: Gender;
  hireDate: string;
  status: EmployeeStatus;
  salary: number;
  version: number;
  band: Band | null;
  compaRatio: number | null;
  bandPosition: BandPosition | null;
}

export interface SalaryChange {
  id: number;
  employeeId: number;
  previousSalary: number | null;
  newSalary: number;
  effectiveDate: string;
  reason: ChangeReason;
  note: string | null;
  createdAt: string;
}

export interface ListQuery {
  search?: string;
  country?: CountryCode;
  department?: string;
  jobTitle?: string;
  status?: EmployeeStatus;
  band?: BandPosition | "none";
  sort?: "name" | "salary" | "compa" | "hireDate";
  order?: "asc" | "desc";
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** One row per active employee with their band, for computing insights in a single pass. */
export interface PayFact {
  country: CountryCode;
  jobTitle: string;
  department: string;
  gender: Gender;
  hireDate: string;
  salary: number;
  band: Band | null;
}

interface Row {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  job_title: string;
  department: string;
  country: CountryCode;
  gender: Gender;
  hire_date: string;
  status: EmployeeStatus;
  salary: number;
  version: number;
  min_salary: number | null;
  mid_salary: number | null;
  max_salary: number | null;
}

const bandOf = (r: { min_salary: number | null; mid_salary: number | null; max_salary: number | null }): Band | null =>
  r.mid_salary === null ? null : { min: r.min_salary!, mid: r.mid_salary, max: r.max_salary! };

const toEmployee = (r: Row): Employee => {
  const band = bandOf(r);
  return {
    id: r.id,
    employeeCode: r.employee_code,
    fullName: r.full_name,
    email: r.email,
    jobTitle: r.job_title,
    department: r.department,
    country: r.country,
    currency: currencyOf(r.country),
    gender: r.gender,
    hireDate: r.hire_date,
    status: r.status,
    salary: r.salary,
    version: r.version,
    band,
    compaRatio: band ? compaRatio(r.salary, band) : null,
    bandPosition: band ? bandPosition(r.salary, band) : null,
  };
};

const SELECT = `
  SELECT e.*, b.min_salary, b.mid_salary, b.max_salary
  FROM employees e
  LEFT JOIN salary_bands b ON b.country = e.country AND b.job_title = e.job_title`;

// Sort expressions are whitelisted here, never built from user input.
const SORTS = {
  name: "e.full_name COLLATE NOCASE",
  salary: "e.salary",
  compa: "CAST(e.salary AS REAL) / b.mid_salary",
  hireDate: "e.hire_date",
} as const;

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export class EmployeeRepository {
  constructor(private readonly db: Db) {}

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  private where(q: Omit<ListQuery, "page" | "pageSize">) {
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};
    if (q.search) {
      clauses.push("(e.full_name LIKE @search ESCAPE '\\' OR e.email LIKE @search ESCAPE '\\' OR e.employee_code LIKE @search ESCAPE '\\')");
      params.search = `%${escapeLike(q.search)}%`;
    }
    for (const [key, column] of [
      ["country", "e.country"],
      ["department", "e.department"],
      ["jobTitle", "e.job_title"],
      ["status", "e.status"],
    ] as const) {
      if (q[key]) {
        clauses.push(`${column} = @${key}`);
        params[key] = q[key];
      }
    }
    if (q.band === "none") clauses.push("b.mid_salary IS NULL");
    if (q.band === "below") clauses.push("e.salary < b.min_salary");
    if (q.band === "above") clauses.push("e.salary > b.max_salary");
    if (q.band === "within") clauses.push("e.salary BETWEEN b.min_salary AND b.max_salary");
    return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", params };
  }

  list(q: ListQuery): Page<Employee> {
    const { sql, params } = this.where(q);
    const order = `ORDER BY ${SORTS[q.sort ?? "name"]} ${q.order === "desc" ? "DESC" : "ASC"} NULLS LAST, e.id ASC`;
    const total = (
      this.db
        .prepare(`SELECT COUNT(*) AS n FROM employees e LEFT JOIN salary_bands b ON b.country = e.country AND b.job_title = e.job_title ${sql}`)
        .get(params) as { n: number }
    ).n;
    const rows = this.db
      .prepare(`${SELECT} ${sql} ${order} LIMIT @limit OFFSET @offset`)
      .all({ ...params, limit: q.pageSize, offset: (q.page - 1) * q.pageSize }) as Row[];
    return { items: rows.map(toEmployee), total, page: q.page, pageSize: q.pageSize };
  }

  /** Same filters as list, without paging. Used for CSV export. */
  *iterate(q: Omit<ListQuery, "page" | "pageSize">): Generator<Employee> {
    const { sql, params } = this.where(q);
    const order = `ORDER BY ${SORTS[q.sort ?? "name"]} ${q.order === "desc" ? "DESC" : "ASC"} NULLS LAST, e.id ASC`;
    for (const row of this.db.prepare(`${SELECT} ${sql} ${order}`).iterate(params)) yield toEmployee(row as Row);
  }

  findById(id: number): Employee | null {
    const row = this.db.prepare(`${SELECT} WHERE e.id = ?`).get(id) as Row | undefined;
    return row ? toEmployee(row) : null;
  }

  emailTaken(email: string, exceptId?: number): boolean {
    return !!this.db.prepare("SELECT 1 FROM employees WHERE email = ? AND id IS NOT ?").get(email, exceptId ?? null);
  }

  create(input: EmployeeCreate): Employee {
    const info = this.db
      .prepare(
        `INSERT INTO employees (full_name, email, job_title, department, country, gender, hire_date, salary)
         VALUES (@fullName, @email, @jobTitle, @department, @country, @gender, @hireDate, @salary)`,
      )
      .run(input);
    const id = Number(info.lastInsertRowid);
    this.db.prepare("UPDATE employees SET employee_code = ? WHERE id = ?").run(`EMP-${String(id).padStart(5, "0")}`, id);
    return this.findById(id)!;
  }

  updateProfile(id: number, input: Omit<EmployeeUpdate, "version">, version: number): Employee | "not_found" | "conflict" {
    const info = this.db
      .prepare(
        `UPDATE employees SET full_name = @fullName, email = @email, job_title = @jobTitle, department = @department,
           country = @country, gender = @gender, hire_date = @hireDate,
           version = version + 1, updated_at = datetime('now')
         WHERE id = @id AND version = @version`,
      )
      .run({ ...input, id, version });
    if (info.changes) return this.findById(id)!;
    return this.db.prepare("SELECT 1 FROM employees WHERE id = ?").get(id) ? "conflict" : "not_found";
  }

  setSalary(id: number, salary: number): void {
    this.db
      .prepare("UPDATE employees SET salary = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?")
      .run(salary, id);
  }

  setStatus(id: number, status: EmployeeStatus): boolean {
    return (
      this.db
        .prepare("UPDATE employees SET status = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?")
        .run(status, id).changes > 0
    );
  }

  addSalaryChange(c: Omit<SalaryChange, "id" | "createdAt" | "note"> & { note?: string | null }): void {
    this.db
      .prepare(
        `INSERT INTO salary_changes (employee_id, previous_salary, new_salary, effective_date, reason, note)
         VALUES (@employeeId, @previousSalary, @newSalary, @effectiveDate, @reason, @note)`,
      )
      .run({ ...c, note: c.note ?? null });
  }

  history(employeeId: number): SalaryChange[] {
    return this.db
      .prepare(
        `SELECT id, employee_id AS employeeId, previous_salary AS previousSalary, new_salary AS newSalary,
                effective_date AS effectiveDate, reason, note, created_at AS createdAt
         FROM salary_changes WHERE employee_id = ? ORDER BY effective_date DESC, id DESC`,
      )
      .all(employeeId) as SalaryChange[];
  }

  payFacts(country?: CountryCode): PayFact[] {
    const rows = this.db
      .prepare(
        `SELECT e.country, e.job_title, e.department, e.gender, e.hire_date, e.salary,
                b.min_salary, b.mid_salary, b.max_salary
         FROM employees e
         LEFT JOIN salary_bands b ON b.country = e.country AND b.job_title = e.job_title
         WHERE e.status = 'active' ${country ? "AND e.country = @country" : ""}`,
      )
      .all(country ? { country } : {}) as (Row & { job_title: string })[];
    return rows.map((r) => ({
      country: r.country,
      jobTitle: r.job_title,
      department: r.department,
      gender: r.gender,
      hireDate: r.hire_date,
      salary: r.salary,
      band: bandOf(r),
    }));
  }

  distinct(column: "job_title" | "department"): string[] {
    return (this.db.prepare(`SELECT DISTINCT ${column} AS v FROM employees ORDER BY v`).all() as { v: string }[]).map((r) => r.v);
  }

  count(): number {
    return (this.db.prepare("SELECT COUNT(*) AS n FROM employees").get() as { n: number }).n;
  }
}
