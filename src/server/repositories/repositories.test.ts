import { beforeEach, describe, expect, it } from "vitest";
import { makeEmployee, testDb } from "../testing/fixtures";

describe("EmployeeRepository", () => {
  let t: ReturnType<typeof testDb>;

  beforeEach(() => {
    t = testDb();
    t.bands.upsert({ country: "GB", jobTitle: "Software Engineer", min: 50_000, mid: 60_000, max: 70_000 });
  });

  it("creates an employee with a readable code, version 0 and the band attached", () => {
    const e = t.employees.create(makeEmployee({ salary: 66_000 }));
    expect(e.employeeCode).toMatch(/^EMP-\d{5}$/);
    expect(e).toMatchObject({ version: 0, status: "active", currency: "GBP", compaRatio: 1.1, bandPosition: "within" });
    expect(e.band).toEqual({ min: 50_000, mid: 60_000, max: 70_000 });
  });

  it("returns a null band and compa-ratio when no band exists for the role", () => {
    const e = t.employees.create(makeEmployee({ jobTitle: "Astronaut" }));
    expect(e.band).toBeNull();
    expect(e.compaRatio).toBeNull();
    expect(e.bandPosition).toBeNull();
  });

  it("rejects a duplicate email at the database level", () => {
    t.employees.create(makeEmployee({ email: "same@acme.com" }));
    expect(() => t.employees.create(makeEmployee({ email: "same@acme.com" }))).toThrow();
  });

  it("updates a profile only when the version matches, and bumps the version", () => {
    const e = t.employees.create(makeEmployee());
    const { salary: _s, ...profile } = makeEmployee({ fullName: "Renamed" });
    const updated = t.employees.updateProfile(e.id, profile, 0);
    expect(updated).toMatchObject({ fullName: "Renamed", version: 1 });
    expect(t.employees.updateProfile(e.id, profile, 0)).toBe("conflict");
    expect(t.employees.updateProfile(999, profile, 0)).toBe("not_found");
  });

  it("records salary history and returns it newest first", () => {
    const e = t.employees.create(makeEmployee({ salary: 60_000 }));
    t.employees.addSalaryChange({ employeeId: e.id, previousSalary: null, newSalary: 60_000, effectiveDate: "2022-01-10", reason: "hire" });
    t.employees.addSalaryChange({ employeeId: e.id, previousSalary: 60_000, newSalary: 65_000, effectiveDate: "2023-01-01", reason: "merit", note: "review" });
    const history = t.employees.history(e.id);
    expect(history.map((h) => h.newSalary)).toEqual([65_000, 60_000]);
    expect(history[0]).toMatchObject({ reason: "merit", note: "review", previousSalary: 60_000 });
  });

  it("filters by search across name, email and code, plus country, status and band position", () => {
    const ada = t.employees.create(makeEmployee({ fullName: "Ada Lovelace", salary: 45_000 }));
    t.employees.create(makeEmployee({ fullName: "Alan Turing", country: "US" }));
    const gone = t.employees.create(makeEmployee({ fullName: "Grace Hopper", salary: 80_000 }));
    t.employees.setStatus(gone.id, "inactive");

    const q = { page: 1, pageSize: 10 };
    expect(t.employees.list({ ...q, search: "lovelace" }).items.map((e) => e.id)).toEqual([ada.id]);
    expect(t.employees.list({ ...q, search: ada.employeeCode }).total).toBe(1);
    expect(t.employees.list({ ...q, country: "US" }).total).toBe(1);
    expect(t.employees.list({ ...q, status: "active" }).total).toBe(2);
    expect(t.employees.list({ ...q, status: "inactive" }).items[0].fullName).toBe("Grace Hopper");
    expect(t.employees.list({ ...q, band: "below" }).items.map((e) => e.fullName)).toEqual(["Ada Lovelace"]);
  });

  it("escapes LIKE wildcards in search", () => {
    t.employees.create(makeEmployee({ fullName: "100% Real" }));
    t.employees.create(makeEmployee({ fullName: "Other" }));
    expect(t.employees.list({ page: 1, pageSize: 10, search: "%" }).total).toBe(1);
  });

  it("paginates and sorts by compa-ratio", () => {
    [48_000, 72_000, 60_000].forEach((salary) => t.employees.create(makeEmployee({ salary })));
    const page = t.employees.list({ page: 1, pageSize: 2, sort: "compa", order: "desc" });
    expect(page.total).toBe(3);
    expect(page.items.map((e) => e.compaRatio)).toEqual([1.2, 1]);
  });

  it("enforces a positive integer salary in the database", () => {
    expect(() => t.employees.create(makeEmployee({ salary: -1 }))).toThrow();
  });
});

describe("BandRepository", () => {
  it("upserts one band per country and job title and lists them", () => {
    const { bands } = testDb();
    bands.upsert({ country: "DE", jobTitle: "Designer", min: 1, mid: 2, max: 3 });
    bands.upsert({ country: "DE", jobTitle: "Designer", min: 10, mid: 20, max: 30 });
    const list = bands.list("DE");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ min: 10, mid: 20, max: 30, currency: "EUR" });
  });

  it("updates a band by id and reports a missing one", () => {
    const { bands } = testDb();
    const b = bands.upsert({ country: "US", jobTitle: "Designer", min: 1, mid: 2, max: 3 });
    expect(bands.update(b.id, { min: 5, mid: 6, max: 7 })).toMatchObject({ min: 5, max: 7 });
    expect(bands.update(999, { min: 5, mid: 6, max: 7 })).toBeNull();
  });
});
