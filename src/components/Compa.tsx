import type { Band } from "@/lib/api";
import { money, POSITION_STYLES } from "@/lib/format";
import { Badge } from "./ui";

/** Compa-ratio pill coloured by where the salary sits in its band. */
export function CompaBadge({ compa, position }: { compa: number | null; position: string | null }) {
  if (compa === null || position === null) return <span className="text-xs text-slate-400">No band</span>;
  const label = position === "within" ? "" : position === "below" ? " below" : " above";
  return (
    <Badge className={POSITION_STYLES[position]}>
      {compa.toFixed(2)}
      {label}
    </Badge>
  );
}

/** Min / mid / max bar with a marker for the salary. Out-of-band salaries are pinned to the edge. */
export function BandBar({ band, salary, currency }: { band: Band; salary: number; currency: string }) {
  const span = band.max - band.min;
  const pct = Math.min(100, Math.max(0, ((salary - band.min) / span) * 100));
  const outside = salary < band.min || salary > band.max;
  return (
    <div className="space-y-1.5">
      <div className="relative h-2.5 rounded-full bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200">
        <div className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-slate-500" style={{ left: "50%" }} />
        <div
          className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${outside ? "bg-amber-500" : "bg-slate-900"}`}
          style={{ left: `${pct}%` }}
          title={money(salary, currency)}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500 tabular-nums">
        <span>{money(band.min, currency)}</span>
        <span>mid {money(band.mid, currency)}</span>
        <span>{money(band.max, currency)}</span>
      </div>
    </div>
  );
}
