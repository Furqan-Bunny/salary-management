// Standard compensation metrics. Definitions and sources are in docs/RESEARCH.md.

export interface Band {
  min: number;
  mid: number;
  max: number;
}

export type BandPosition = "below" | "within" | "above";

const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

/** Salary relative to the band midpoint. 1.00 = paid at target. */
export function compaRatio(salary: number, band: Band): number {
  return round(salary / band.mid, 2);
}

/** How far through the band the salary sits: 0 at the minimum, 1 at the maximum. */
export function rangePenetration(salary: number, band: Band): number {
  return round((salary - band.min) / (band.max - band.min), 2);
}

export function bandPosition(salary: number, band: Band): BandPosition {
  if (salary < band.min) return "below";
  if (salary > band.max) return "above";
  return "within";
}

/** Median gender pay gap as % of men's median pay; the measure used by UK and EU reporting. */
export function payGapPercent(medians: { men: number; women: number }): number {
  return round(((medians.men - medians.women) / medians.men) * 100, 1);
}

export function tenureYears(hireDate: string, today: Date = new Date()): number {
  const hired = new Date(`${hireDate}T00:00:00Z`);
  let years = today.getUTCFullYear() - hired.getUTCFullYear();
  const beforeAnniversary =
    today.getUTCMonth() < hired.getUTCMonth() ||
    (today.getUTCMonth() === hired.getUTCMonth() && today.getUTCDate() < hired.getUTCDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

export function changePercent(from: number, to: number): number {
  return round(((to - from) / from) * 100, 1);
}
