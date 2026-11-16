import { beforeEach, describe, expect, it } from "vitest";
import { makeEmployee, testDb } from "../testing/fixtures";
import { BandService } from "./bandService";
import { EmployeeService } from "./employeeService";
import { ConflictError, NotFoundError, ValidationError } from "./errors";

function fieldErrors(fn: () => unknown): Record<string, string> {
  try {
    fn();
  } catch (e) {
    if (e instanceof ValidationError) return e.fieldErrors;
    throw e;
  }
  throw new Error("expected a ValidationError");
}

describe("EmployeeService", () => {
  let t: ReturnType<typeof testDb>;
  let service: EmployeeService;

  beforeEach(() => {
    t = testDb();
    service = new EmployeeService(t.employees);
    t.bands.upsert({ country: "GB", jobTitle: "Software Engineer", min: 50_000, mid: 60_000, max: 70_000 });
  });

  describe("create", () => {
    it("creates the employee and records the starting salary as a 'hire' change", () => {
      const e = service.create(makeEmployee({ salary: 58_000, hireDate: "2024-03-01" }));
      expect(service.history(e.id)).toEqual([
        expect.objectContaining({ previousSalary: null, newSalary: 58_000, effectiveDate: "2024-03-01", reason: "hire" }),
      ]);
    });

    it("returns per-field errors for invalid input", () => {
      expect(fieldErrors(() => service.create({ ...makeEmployee(), salary: -1, country: "XX" }))).toMatchObject({
        salary: "Salary must be greater than zero",
        country: "Country is not supported",
      });
    });

    it("rejects a duplicate email with a friendly field error", () => {
      service.create(makeEmployee({ email: "ada@acme.com" }));
      expect(fieldErrors(() => service.create(makeEmployee({ email: "ADA@acme.com" })))).toEqual({
        email: "Another employee already uses this email",
      });
    });
  });

  describe("updateProfile", () => {
    it("rejects a stale version with a ConflictError", () => {
      const e = service.create(makeEmployee());
      const { salary: _s, ...profile } = makeEmployee({ fullName: "First edit" });
      service.updateProfile(e.id, { ...profile, version: 0 });
      expect(() => service.updateProfile(e.id, { ...profile, fullName: "Second edit", version: 0 })).toThrow(ConflictError);
    });

    it("throws NotFound for a missing employee", () => {
      const { salary: _s, ...profile } = makeEmployee();
      expect(() => service.updateProfile(42, { ...profile, version: 0 })).toThrow(NotFoundError);
    });
  });

  describe("changeSalary", () => {
    it("appends history, updates the current salary and reports the % change and band position", () => {
      const e = service.create(makeEmployee({ salary: 60_000, hireDate: "2022-01-10" }));
      const result = service.changeSalary(e.id, { newSalary: "75000", effectiveDate: "2024-01-01", reason: "promotion", note: "Lead" });
      expect(result.employee.salary).toBe(75_000);
      expect(result.changePercent).toBe(25);
      expect(result.employee.bandPosition).toBe("above");
      expect(service.history(e.id)[0]).toMatchObject({ previousSalary: 60_000, newSalary: 75_000, reason: "promotion", note: "Lead" });
    });

    it("rejects an effective date before the hire date or before the last change", () => {
      const e = service.create(makeEmployee({ hireDate: "2022-01-10" }));
      expect(fieldErrors(() => service.changeSalary(e.id, { newSalary: 70_000, effectiveDate: "2021-12-31", reason: "merit" }))).toEqual({
        effectiveDate: "Effective date cannot be before the hire date (2022-01-10)",
      });
      service.changeSalary(e.id, { newSalary: 65_000, effectiveDate: "2023-06-01", reason: "merit" });
      expect(fieldErrors(() => service.changeSalary(e.id, { newSalary: 70_000, effectiveDate: "2023-05-01", reason: "merit" }))).toEqual({
        effectiveDate: "Effective date cannot be before the last change (2023-06-01)",
      });
    });

    it("rejects a change to the same salary", () => {
      const e = service.create(makeEmployee({ salary: 60_000 }));
      expect(fieldErrors(() => service.changeSalary(e.id, { newSalary: 60_000, effectiveDate: "2024-01-01", reason: "merit" }))).toEqual({
        newSalary: "New salary is the same as the current salary",
      });
    });

    it("does not allow salary changes for inactive employees", () => {
      const e = service.create(makeEmployee());
      service.setStatus(e.id, "inactive");
      expect(() => service.changeSalary(e.id, { newSalary: 99_000, effectiveDate: "2024-01-01", reason: "merit" })).toThrow(ConflictError);
    });
  });

  describe("list and export", () => {
    it("falls back to safe defaults for bad query params and lists active employees by default", () => {
      service.create(makeEmployee());
      const gone = service.create(makeEmployee());
      service.setStatus(gone.id, "inactive");
      const page = service.list({ page: "-3", pageSize: "100000", sort: "drop table", country: "ZZ", band: "sideways" });
      expect(page).toMatchObject({ page: 1, pageSize: 25, total: 1 });
      expect(service.list({ status: "all" }).total).toBe(2);
    });

    it("exports the filtered list as CSV with a header and quoted fields", () => {
      service.create(makeEmployee({ fullName: 'Ann "The Boss", Smith', salary: 66_000 }));
      const csv = service.exportCsv({});
      const [header, row] = csv.trim().split("\n");
      expect(header).toBe("Employee code,Full name,Email,Job title,Department,Country,Currency,Gender,Hire date,Status,Salary,Band min,Band mid,Band max,Compa-ratio,Band position");
      expect(row).toContain('"Ann ""The Boss"", Smith"');
      expect(row).toContain("66000,50000,60000,70000,1.1,within");
    });

    it("neutralises spreadsheet formulas in exported text", () => {
      service.create(makeEmployee({ fullName: "=HYPERLINK(1)" }));
      expect(service.exportCsv({})).toContain("'=HYPERLINK(1)");
    });
  });
});

describe("BandService", () => {
  it("validates and updates a band, throwing NotFound for a missing one", () => {
    const t = testDb();
    const service = new BandService(t.bands);
    const band = t.bands.upsert({ country: "GB", jobTitle: "Designer", min: 40_000, mid: 50_000, max: 60_000 });
    expect(service.update(band.id, { min: "45000", mid: "55000", max: "65000" })).toMatchObject({ min: 45_000 });
    expect(fieldErrors(() => service.update(band.id, { min: 9, mid: 5, max: 10 }))).toEqual({
      mid: "Band must satisfy minimum < midpoint < maximum",
    });
    expect(() => service.update(999, { min: 1, mid: 2, max: 3 })).toThrow(NotFoundError);
  });
});
