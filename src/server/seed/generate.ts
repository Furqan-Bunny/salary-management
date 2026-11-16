import type { CountryCode } from "../domain/countries";
import type { ChangeReason, EmployeeCreate, Gender } from "../domain/schemas";

/** Fixed "today" for the seed so every run produces identical data. */
export const SEED_REFERENCE_DATE = "2026-11-01";

/**
 * Patterns deliberately planted so the insights screens have something real to find.
 * Documented in docs/SEED_DATA.md; everything else is random within realistic ranges.
 */
export const PLANTED = {
  payGap: [
    { country: "DE" as CountryCode, jobTitle: "Senior Software Engineer" },
    { country: "IN" as CountryCode, jobTitle: "Sales Representative" },
  ],
  compression: [
    { country: "US" as CountryCode, jobTitle: "Software Engineer" },
    { country: "GB" as CountryCode, jobTitle: "Data Scientist" },
  ],
};

// Mulberry32: tiny seeded PRNG, so the same seed always yields the same company.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Share of headcount and a typical mid-level salary in local currency.
const COUNTRY_PROFILE: Record<CountryCode, { weight: number; base: number }> = {
  US: { weight: 30, base: 110_000 },
  IN: { weight: 22, base: 1_800_000 },
  GB: { weight: 12, base: 60_000 },
  DE: { weight: 10, base: 65_000 },
  CA: { weight: 8, base: 95_000 },
  AU: { weight: 7, base: 105_000 },
  SG: { weight: 6, base: 95_000 },
  AE: { weight: 5, base: 300_000 },
};

// Job title, department and pay relative to the country's mid-level base.
export const ROLES = [
  { title: "Software Engineer", department: "Engineering", factor: 1.0, weight: 18 },
  { title: "Senior Software Engineer", department: "Engineering", factor: 1.35, weight: 10 },
  { title: "Engineering Manager", department: "Engineering", factor: 1.7, weight: 3 },
  { title: "QA Engineer", department: "Engineering", factor: 0.85, weight: 5 },
  { title: "Product Manager", department: "Product", factor: 1.3, weight: 4 },
  { title: "Product Designer", department: "Product", factor: 1.0, weight: 3 },
  { title: "Data Analyst", department: "Data", factor: 0.9, weight: 5 },
  { title: "Data Scientist", department: "Data", factor: 1.25, weight: 3 },
  { title: "Sales Representative", department: "Sales", factor: 0.75, weight: 10 },
  { title: "Account Executive", department: "Sales", factor: 1.0, weight: 6 },
  { title: "Customer Support Specialist", department: "Support", factor: 0.6, weight: 12 },
  { title: "Marketing Specialist", department: "Marketing", factor: 0.85, weight: 5 },
  { title: "HR Generalist", department: "People", factor: 0.8, weight: 3 },
  { title: "Recruiter", department: "People", factor: 0.8, weight: 3 },
  { title: "Finance Analyst", department: "Finance", factor: 0.95, weight: 4 },
  { title: "Operations Manager", department: "Operations", factor: 1.2, weight: 4 },
  { title: "Director", department: "Leadership", factor: 2.3, weight: 2 },
];

const FIRST = ["Aarav", "Olivia", "Liam", "Emma", "Noah", "Ava", "Mia", "Lucas", "Sofia", "Arjun", "Hannah", "Omar",
  "Leah", "Ethan", "Priya", "Jonas", "Chloe", "Mateo", "Zara", "Daniel", "Aisha", "Ben", "Isla", "Kenji", "Nora",
  "Ravi", "Grace", "Felix", "Layla", "Sam", "Elena", "Yusuf", "Maya", "Leo", "Fatima", "Jack", "Anika", "Max", "Ruby", "Wei"];
const LAST = ["Smith", "Patel", "Müller", "Brown", "Khan", "Garcia", "Wilson", "Sharma", "Taylor", "Schmidt", "Lee",
  "Nguyen", "Singh", "Martin", "Clarke", "Fischer", "Tan", "Ali", "Walker", "Kumar", "Wright", "Weber", "Chen",
  "Hughes", "Rao", "Evans", "Becker", "Lim", "Hassan", "Scott", "Iyer", "Moore", "Wagner", "Ong", "Reddy", "Green"];

const GENDER_WEIGHTS: { value: Gender; weight: number }[] = [
  { value: "female", weight: 45 },
  { value: "male", weight: 50 },
  { value: "non_binary", weight: 2 },
  { value: "undisclosed", weight: 3 },
];

export interface SeedBand {
  country: CountryCode;
  jobTitle: string;
  min: number;
  mid: number;
  max: number;
}

export interface SeedChange {
  previousSalary: number | null;
  newSalary: number;
  effectiveDate: string;
  reason: ChangeReason;
  note?: string;
}

export interface SeedEmployee {
  employee: EmployeeCreate;
  history: SeedChange[];
}

function weighted<T extends { weight: number }>(items: T[], r: number): T {
  let x = r * items.reduce((s, i) => s + i.weight, 0);
  for (const item of items) {
    x -= item.weight;
    if (x < 0) return item;
  }
  return items[items.length - 1];
}

const DAY = 86_400_000;
const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const asciiSlug = (s: string) => s.normalize("NFD").replace(/[^a-zA-Z]/g, "").toLowerCase();

export function generateBands(): SeedBand[] {
  const bands: SeedBand[] = [];
  for (const [country, profile] of Object.entries(COUNTRY_PROFILE) as [CountryCode, { base: number }][]) {
    for (const role of ROLES) {
      const mid = roundTo(profile.base * role.factor, 1000);
      bands.push({ country, jobTitle: role.title, min: roundTo(mid * 0.8, 100), mid, max: roundTo(mid * 1.2, 100) });
    }
  }
  return bands;
}

export function generateDataset(count: number, seed = 42): { bands: SeedBand[]; employees: SeedEmployee[] } {
  const random = rng(seed);
  const between = (lo: number, hi: number) => lo + random() * (hi - lo);
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];
  const bands = generateBands();
  const bandFor = new Map(bands.map((b) => [`${b.country}|${b.jobTitle}`, b]));
  const countries = Object.entries(COUNTRY_PROFILE).map(([code, p]) => ({ code: code as CountryCode, weight: p.weight }));
  const today = Date.parse(`${SEED_REFERENCE_DATE}T00:00:00Z`);

  const employees = Array.from({ length: count }, (_, i): SeedEmployee => {
    const country = weighted(countries, random()).code;
    const role = weighted(ROLES, random());
    const gender = weighted(GENDER_WEIGHTS, random()).value;
    const band = bandFor.get(`${country}|${role.title}`)!;
    const first = pick(FIRST);
    const last = pick(LAST);

    // Tenure skews recent, like most growing companies: up to 12 years.
    const daysAgo = Math.floor(random() ** 1.6 * 365 * 12);
    const hire = today - daysAgo * DAY;
    const isCompressed = PLANTED.compression.some((p) => p.country === country && p.jobTitle === role.title);
    const recentHire = daysAgo < 365;
    // The planted gap works the way it tends to in practice: a lower offer at hire, then smaller raises.
    const underpaid = gender === "female" && PLANTED.payGap.some((p) => p.country === country && p.jobTitle === role.title);

    // Starting pay: people hired long ago started lower relative to today's band (bands drift up with the market).
    const drift = Math.max(0.72, 1 - 0.025 * (daysAgo / 365));
    const startFactor =
      (isCompressed && recentHire ? between(1.08, 1.16) : between(0.86, 1.06) * drift) * (underpaid ? 0.93 : 1);
    let salary = roundTo(band.mid * startFactor, 100);

    const history: SeedChange[] = [{ previousSalary: null, newSalary: salary, effectiveDate: isoDate(hire), reason: "hire" }];

    // Roughly one change a year: mostly merit, sometimes promotion-sized or market adjustments.
    let at = hire + between(300, 450) * DAY;
    while (at < today) {
      const roll = random();
      const [reason, pct]: [ChangeReason, number] =
        roll < 0.75 ? ["merit", between(0.02, isCompressed ? 0.03 : 0.06)]
        : roll < 0.9 ? ["promotion", between(0.08, 0.15)]
        : ["market_adjustment", between(0.04, 0.08)];
      const next = roundTo(salary * (1 + (underpaid ? pct * 0.5 : pct)), 100);
      history.push({ previousSalary: salary, newSalary: next, effectiveDate: isoDate(at), reason });
      salary = next;
      at += between(300, 500) * DAY;
    }

    return {
      employee: {
        fullName: `${first} ${last}`,
        email: `${asciiSlug(first)}.${asciiSlug(last)}.${i + 1}@acme.example`,
        jobTitle: role.title,
        department: role.department,
        country,
        gender,
        hireDate: isoDate(hire),
        salary,
      },
      history,
    };
  });

  return { bands, employees };
}
