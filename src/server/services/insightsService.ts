import { bandPosition, compaRatio, payGapPercent, tenureYears, type Band } from "../domain/compensation";
import { COUNTRIES, currencyOf, toUsd, type CountryCode } from "../domain/countries";
import { median, summarize, type SalaryStats } from "../domain/stats";
import type { EmployeeRepository, PayFact } from "../repositories/employeeRepository";

/** Below this group size a median is noise, and small groups can identify individuals. */
export const MIN_GROUP_SIZE = 5;
/** EU Pay Transparency Directive: an unexplained gap of 5% or more requires action. */
export const PAY_GAP_THRESHOLD = 5;
const RECENT_HIRE_YEARS = 1;
const TENURED_YEARS = 3;

export interface Overview {
  headcount: number;
  countries: number;
  payrollUsd: number;
  outOfBandPercent: number;
}

export interface CountryInsight extends SalaryStats {
  country: CountryCode;
  countryName: string;
  currency: string;
  medianUsd: number;
}

export interface JobTitleInsight {
  jobTitle: string;
  count: number;
  median: number;
  average: number;
  band: Band | null;
  averageCompaRatio: number | null;
}

export interface BandHealth {
  country: CountryCode;
  below: number;
  within: number;
  above: number;
  noBand: number;
}

export interface PayEquityRow {
  jobTitle: string;
  men: number;
  women: number;
  menMedian: number;
  womenMedian: number;
  gapPercent: number;
  flagged: boolean;
}

export interface CompressionRow {
  jobTitle: string;
  recentHires: number;
  tenured: number;
  recentMedianCompa: number;
  tenuredMedianCompa: number;
  flagged: boolean;
}

export interface DepartmentInsight {
  department: string;
  count: number;
  payroll: number;
  median: number;
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = groups.get(k);
    if (list) list.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export class InsightsService {
  constructor(
    private readonly repo: EmployeeRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  overview(): Overview {
    const facts = this.repo.payFacts();
    const outOfBand = facts.filter((f) => f.band && bandPosition(f.salary, f.band) !== "within").length;
    return {
      headcount: facts.length,
      countries: new Set(facts.map((f) => f.country)).size,
      payrollUsd: facts.reduce((sum, f) => sum + toUsd(f.salary, f.country), 0),
      outOfBandPercent: facts.length ? Math.round((outOfBand / facts.length) * 1000) / 10 : 0,
    };
  }

  /** Per-country stats in local currency, largest country first. */
  byCountry(): CountryInsight[] {
    return [...groupBy(this.repo.payFacts(), (f) => f.country)]
      .map(([country, facts]) => {
        const stats = summarize(facts.map((f) => f.salary));
        return {
          country,
          countryName: COUNTRIES[country].name,
          currency: currencyOf(country),
          ...stats,
          medianUsd: toUsd(stats.median, country),
        };
      })
      .sort((a, b) => b.count - a.count);
  }

  byJobTitle(country: CountryCode): JobTitleInsight[] {
    return [...groupBy(this.repo.payFacts(country), (f) => f.jobTitle)]
      .map(([jobTitle, facts]) => {
        const { count, median, average } = summarize(facts.map((f) => f.salary));
        const band = facts[0].band;
        const averageCompaRatio = band
          ? round2(facts.reduce((sum, f) => sum + compaRatio(f.salary, band), 0) / facts.length)
          : null;
        return { jobTitle, count, median, average, band, averageCompaRatio };
      })
      .sort((a, b) => a.jobTitle.localeCompare(b.jobTitle));
  }

  bandHealth(): BandHealth[] {
    return [...groupBy(this.repo.payFacts(), (f) => f.country)]
      .map(([country, facts]) => {
        const row: BandHealth = { country, below: 0, within: 0, above: 0, noBand: 0 };
        for (const f of facts) {
          if (f.band) row[bandPosition(f.salary, f.band)] += 1;
          else row.noBand += 1;
        }
        return row;
      })
      .sort((a, b) => b.below + b.within + b.above + b.noBand - (a.below + a.within + a.above + a.noBand));
  }

  /** Median gender pay gap per job title, largest gap first. Small groups are left out. */
  payEquity(country: CountryCode): PayEquityRow[] {
    const rows: PayEquityRow[] = [];
    for (const [jobTitle, facts] of groupBy(this.repo.payFacts(country), (f) => f.jobTitle)) {
      const men = facts.filter((f) => f.gender === "male").map((f) => f.salary);
      const women = facts.filter((f) => f.gender === "female").map((f) => f.salary);
      if (men.length < MIN_GROUP_SIZE || women.length < MIN_GROUP_SIZE) continue;
      const medians = { men: median(men), women: median(women) };
      const gapPercent = payGapPercent(medians);
      rows.push({
        jobTitle,
        men: men.length,
        women: women.length,
        menMedian: Math.round(medians.men),
        womenMedian: Math.round(medians.women),
        gapPercent,
        flagged: gapPercent >= PAY_GAP_THRESHOLD,
      });
    }
    return rows.sort((a, b) => b.gapPercent - a.gapPercent);
  }

  /** Roles where people hired in the last year sit higher in the band than people with 3+ years. */
  compression(country: CountryCode): CompressionRow[] {
    const today = this.now();
    const rows: CompressionRow[] = [];
    for (const [jobTitle, facts] of groupBy(this.repo.payFacts(country), (f) => f.jobTitle)) {
      const band = facts[0].band;
      if (!band) continue;
      const compa = (list: PayFact[]) => list.map((f) => compaRatio(f.salary, band));
      const recent = compa(facts.filter((f) => tenureYears(f.hireDate, today) < RECENT_HIRE_YEARS));
      const tenured = compa(facts.filter((f) => tenureYears(f.hireDate, today) >= TENURED_YEARS));
      if (!recent.length || !tenured.length) continue;
      const recentMedianCompa = round2(median(recent));
      const tenuredMedianCompa = round2(median(tenured));
      rows.push({
        jobTitle,
        recentHires: recent.length,
        tenured: tenured.length,
        recentMedianCompa,
        tenuredMedianCompa,
        flagged: recentMedianCompa > tenuredMedianCompa,
      });
    }
    return rows.sort((a, b) => b.recentMedianCompa - b.tenuredMedianCompa - (a.recentMedianCompa - a.tenuredMedianCompa));
  }

  byDepartment(country: CountryCode): DepartmentInsight[] {
    return [...groupBy(this.repo.payFacts(country), (f) => f.department)]
      .map(([department, facts]) => {
        const salaries = facts.map((f) => f.salary);
        return {
          department,
          count: facts.length,
          payroll: salaries.reduce((a, b) => a + b, 0),
          median: Math.round(median(salaries)),
        };
      })
      .sort((a, b) => b.count - a.count || a.department.localeCompare(b.department));
  }
}
