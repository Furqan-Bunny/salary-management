import type { Db } from "../db/connection";
import { currencyOf, type CountryCode } from "../domain/countries";
import type { BandInput } from "../domain/schemas";

export interface SalaryBand {
  id: number;
  country: CountryCode;
  currency: string;
  jobTitle: string;
  min: number;
  mid: number;
  max: number;
  updatedAt: string;
}

interface Row {
  id: number;
  country: CountryCode;
  job_title: string;
  min_salary: number;
  mid_salary: number;
  max_salary: number;
  updated_at: string;
}

const toBand = (r: Row): SalaryBand => ({
  id: r.id,
  country: r.country,
  currency: currencyOf(r.country),
  jobTitle: r.job_title,
  min: r.min_salary,
  mid: r.mid_salary,
  max: r.max_salary,
  updatedAt: r.updated_at,
});

export class BandRepository {
  constructor(private readonly db: Db) {}

  list(country?: CountryCode): SalaryBand[] {
    const rows = country
      ? this.db.prepare("SELECT * FROM salary_bands WHERE country = ? ORDER BY job_title").all(country)
      : this.db.prepare("SELECT * FROM salary_bands ORDER BY country, job_title").all();
    return (rows as Row[]).map(toBand);
  }

  findById(id: number): SalaryBand | null {
    const row = this.db.prepare("SELECT * FROM salary_bands WHERE id = ?").get(id) as Row | undefined;
    return row ? toBand(row) : null;
  }

  upsert(b: { country: CountryCode; jobTitle: string } & BandInput): SalaryBand {
    const row = this.db
      .prepare(
        `INSERT INTO salary_bands (country, job_title, min_salary, mid_salary, max_salary)
         VALUES (@country, @jobTitle, @min, @mid, @max)
         ON CONFLICT (country, job_title) DO UPDATE SET
           min_salary = excluded.min_salary, mid_salary = excluded.mid_salary,
           max_salary = excluded.max_salary, updated_at = datetime('now')
         RETURNING *`,
      )
      .get(b) as Row;
    return toBand(row);
  }

  update(id: number, b: BandInput): SalaryBand | null {
    const row = this.db
      .prepare(
        `UPDATE salary_bands SET min_salary = @min, mid_salary = @mid, max_salary = @max, updated_at = datetime('now')
         WHERE id = @id RETURNING *`,
      )
      .get({ ...b, id }) as Row | undefined;
    return row ? toBand(row) : null;
  }
}
