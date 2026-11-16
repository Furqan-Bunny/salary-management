// Supported countries. Currency is derived from the country so it can never be entered wrong.
// usdRate is a fixed planning rate (1 unit of local currency in USD), documented in docs/TRADEOFFS.md.
export const COUNTRIES = {
  US: { name: "United States", currency: "USD", usdRate: 1 },
  GB: { name: "United Kingdom", currency: "GBP", usdRate: 1.27 },
  DE: { name: "Germany", currency: "EUR", usdRate: 1.08 },
  IN: { name: "India", currency: "INR", usdRate: 0.012 },
  CA: { name: "Canada", currency: "CAD", usdRate: 0.73 },
  AU: { name: "Australia", currency: "AUD", usdRate: 0.66 },
  SG: { name: "Singapore", currency: "SGD", usdRate: 0.74 },
  AE: { name: "United Arab Emirates", currency: "AED", usdRate: 0.27 },
} as const;

export type CountryCode = keyof typeof COUNTRIES;

export const COUNTRY_CODES = Object.keys(COUNTRIES) as [CountryCode, ...CountryCode[]];

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && value in COUNTRIES;
}

export function currencyOf(country: CountryCode): string {
  return COUNTRIES[country].currency;
}

export function toUsd(amount: number, country: CountryCode): number {
  return Math.round(amount * COUNTRIES[country].usdRate);
}
