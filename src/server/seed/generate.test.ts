import { describe, expect, it } from "vitest";
import { bandPosition, payGapPercent } from "../domain/compensation";
import { median } from "../domain/stats";
import { employeeCreateSchema } from "../domain/schemas";
import { generateDataset, PLANTED, SEED_REFERENCE_DATE } from "./generate";

describe("generateDataset", () => {
  const data = generateDataset(3000);

  it("creates the requested number of employees and a band for every country and role", () => {
    expect(data.employees).toHaveLength(3000);
    expect(data.bands.length).toBe(8 * 17);
    for (const b of data.bands) expect(b.min < b.mid && b.mid < b.max).toBe(true);
  });

  it("is deterministic for the same seed and different for another", () => {
    expect(generateDataset(40, 7)).toEqual(generateDataset(40, 7));
    expect(generateDataset(40, 7)).not.toEqual(generateDataset(40, 8));
  });

  it("only produces employees that pass the same validation as the API, with unique emails", () => {
    for (const { employee } of data.employees) expect(employeeCreateSchema.safeParse(employee).success).toBe(true);
    expect(new Set(data.employees.map((e) => e.employee.email)).size).toBe(3000);
  });

  it("gives every employee a consistent salary history ending at the current salary", () => {
    for (const { employee, history } of data.employees) {
      expect(history[0]).toMatchObject({ reason: "hire", previousSalary: null, effectiveDate: employee.hireDate });
      for (let i = 1; i < history.length; i++) {
        expect(history[i].previousSalary).toBe(history[i - 1].newSalary);
        expect(history[i].effectiveDate >= history[i - 1].effectiveDate).toBe(true);
        expect(history[i].effectiveDate <= SEED_REFERENCE_DATE).toBe(true);
      }
      expect(history.at(-1)!.newSalary).toBe(employee.salary);
    }
  });

  it("keeps most people within band but not all, like a real company", () => {
    const bandFor = new Map(data.bands.map((b) => [`${b.country}|${b.jobTitle}`, b]));
    const out = data.employees.filter(({ employee: e }) => bandPosition(e.salary, bandFor.get(`${e.country}|${e.jobTitle}`)!) !== "within");
    const share = out.length / data.employees.length;
    expect(share).toBeGreaterThan(0.02);
    expect(share).toBeLessThan(0.2);
  });

  it("plants a visible gender pay gap in the documented roles", () => {
    const full = generateDataset(10_000);
    for (const { country, jobTitle } of PLANTED.payGap) {
      const people = full.employees.map((e) => e.employee).filter((e) => e.country === country && e.jobTitle === jobTitle);
      const gap = payGapPercent({
        men: median(people.filter((e) => e.gender === "male").map((e) => e.salary)),
        women: median(people.filter((e) => e.gender === "female").map((e) => e.salary)),
      });
      expect(gap).toBeGreaterThanOrEqual(5);
    }
  });
});
