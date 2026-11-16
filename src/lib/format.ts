export function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function compactMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(amount);
}

export function percent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function signedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export const REASON_LABELS: Record<string, string> = {
  hire: "Hire",
  merit: "Merit increase",
  promotion: "Promotion",
  market_adjustment: "Market adjustment",
  correction: "Correction",
};

export const GENDER_LABELS: Record<string, string> = {
  female: "Female",
  male: "Male",
  non_binary: "Non-binary",
  undisclosed: "Prefer not to say",
};

export const POSITION_STYLES: Record<string, string> = {
  below: "bg-amber-100 text-amber-800",
  within: "bg-emerald-50 text-emerald-700",
  above: "bg-sky-100 text-sky-800",
};
