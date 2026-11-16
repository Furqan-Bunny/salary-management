export interface SalaryStats {
  count: number;
  min: number;
  max: number;
  average: number;
  median: number;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Pure so it can be tested without a database. Money stays in whole currency units.
export function summarize(values: readonly number[]): SalaryStats {
  if (values.length === 0) return { count: 0, min: 0, max: 0, average: 0, median: 0 };
  let min = Infinity;
  let max = -Infinity;
  let total = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    total += v;
  }
  return { count: values.length, min, max, average: Math.round(total / values.length), median: Math.round(median(values)) };
}
