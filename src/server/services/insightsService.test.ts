import { beforeEach, describe, expect, it } from "vitest";
import type { EmployeeCreate } from "../domain/schemas";
import { makeEmployee, testDb } from "../testing/fixtures";
import { InsightsService } from "./insightsService";

const TODAY = new Date("2026-06-01");

describe("InsightsService", () => {
  let t: ReturnType<typeof testDb>;
  let insights: InsightsService;
  const add = (over: Partial<EmployeeCreate>) => t.employees.create(makeEmployee(over));

  beforeEach(() => {
    t = testDb();
    insights = new InsightsService(t.employees, () => TODAY);
    t.bands.upsert({ country: "GB", jobTitle: "Software Engineer", min: 50_000, mid: 60_000, max: 70_000 });
    t.bands.upsert({ country: "US", jobTitle: "Software Engineer", min: 90_000, mid: 100_000, max: 110_000 });
  });

  it("gives an overview of active staff with payroll in USD and the share out of band", () => {
    add({ country: "GB", salary: 60_000 });
    add({ country: "GB", salary: 45_000 }); // below band
    add({ country: "US", salary: 100_000 });
    const gone = add({ country: "US", salary: 500_000 });
    t.employees.setStatus(gone.id, "inactive");

    expect(insights.overview()).toEqual({
      headcount: 3,
      countries: 2,
      payrollUsd: Math.round(60_000 * 1.27) + Math.round(45_000 * 1.27) + 100_000,
      outOfBandPercent: 33.3,
    });
  });

  it("summarises each country in local currency with the median also in USD", () => {
    [50_000, 60_000, 70_000].forEach((salary) => add({ country: "GB", salary }));
    add({ country: "US", salary: 100_000 });
    const [gb, us] = insights.byCountry();
    expect(gb).toMatchObject({ country: "GB", currency: "GBP", count: 3, min: 50_000, median: 60_000, max: 70_000, medianUsd: 76_200 });
    expect(us).toMatchObject({ country: "US", count: 1 });
  });

  it("breaks a country down by job title with the band and average compa-ratio", () => {
    add({ salary: 54_000 });
    add({ salary: 66_000 });
    add({ jobTitle: "Astronaut", salary: 99_000 });
    expect(insights.byJobTitle("GB")).toEqual([
      { jobTitle: "Astronaut", count: 1, median: 99_000, average: 99_000, band: null, averageCompaRatio: null },
      { jobTitle: "Software Engineer", count: 2, median: 60_000, average: 60_000, band: { min: 50_000, mid: 60_000, max: 70_000 }, averageCompaRatio: 1 },
    ]);
  });

  it("counts people below, within and above band per country", () => {
    [40_000, 60_000, 65_000, 80_000].forEach((salary) => add({ salary }));
    add({ jobTitle: "Astronaut" });
    expect(insights.bandHealth()).toEqual([{ country: "GB", below: 1, within: 2, above: 1, noBand: 1 }]);
  });

  describe("payEquity", () => {
    it("reports the median gap per job title and flags gaps of 5% or more", () => {
      [60_000, 62_000, 64_000, 66_000, 68_000].forEach((salary) => [0, 1].forEach(() => add({ gender: "male", salary })));
      [56_000, 58_000, 59_000, 60_000, 61_000].forEach((salary) => [0, 1].forEach(() => add({ gender: "female", salary })));
      expect(insights.payEquity("GB")).toEqual([
        { jobTitle: "Software Engineer", men: 10, women: 10, menMedian: 64_000, womenMedian: 59_000, gapPercent: 7.8, flagged: true },
      ]);
    });

    it("hides groups with fewer than 10 people on either side", () => {
      Array.from({ length: 12 }, (_, i) => add({ gender: "male", salary: 60_000 + i * 100 }));
      Array.from({ length: 9 }, (_, i) => add({ gender: "female", salary: 50_000 + i * 100 }));
      expect(insights.payEquity("GB")).toEqual([]);
    });
  });

  describe("compression", () => {
    it("flags roles where recent hires sit at a higher compa-ratio than tenured staff", () => {
      ["2026-01-01", "2025-12-01"].forEach((hireDate) => add({ hireDate, salary: 66_000 })); // recent, compa 1.1
      ["2020-01-01", "2019-05-01"].forEach((hireDate) => add({ hireDate, salary: 57_000 })); // tenured, compa 0.95
      add({ hireDate: "2024-06-01", salary: 60_000 }); // in between: ignored
      expect(insights.compression("GB")).toEqual([
        { jobTitle: "Software Engineer", recentHires: 2, tenured: 2, recentMedianCompa: 1.1, tenuredMedianCompa: 0.95, flagged: true },
      ]);
    });

    it("does not flag differences smaller than 0.03 of compa-ratio", () => {
      add({ hireDate: "2026-01-01", salary: 61_200 }); // compa 1.02
      add({ hireDate: "2020-01-01", salary: 60_000 }); // compa 1.00
      expect(insights.compression("GB")[0].flagged).toBe(false);
    });

    it("skips roles without a band or without both groups", () => {
      add({ hireDate: "2026-01-01", jobTitle: "Astronaut" });
      add({ hireDate: "2026-01-01" });
      expect(insights.compression("GB")).toEqual([]);
    });
  });

  it("totals headcount and payroll by department for a country", () => {
    add({ department: "Engineering", salary: 60_000 });
    add({ department: "Engineering", salary: 70_000 });
    add({ department: "Sales", salary: 40_000 });
    expect(insights.byDepartment("GB")).toEqual([
      { department: "Engineering", count: 2, payroll: 130_000, median: 65_000 },
      { department: "Sales", count: 1, payroll: 40_000, median: 40_000 },
    ]);
  });

  it("handles an empty organisation", () => {
    expect(insights.overview()).toEqual({ headcount: 0, countries: 0, payrollUsd: 0, outOfBandPercent: 0 });
    expect(insights.byCountry()).toEqual([]);
    expect(insights.payEquity("DE")).toEqual([]);
  });
});
