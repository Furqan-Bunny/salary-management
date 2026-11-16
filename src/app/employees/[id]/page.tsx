import Link from "next/link";
import { notFound } from "next/navigation";
import { BandBar, CompaBadge } from "@/components/Compa";
import { EmployeeActions } from "@/components/EmployeeActions";
import { Badge, Card } from "@/components/ui";
import { GENDER_LABELS, money, percent, REASON_LABELS, signedPercent } from "@/lib/format";
import { services } from "@/server/container";
import { changePercent, rangePenetration, tenureYears } from "@/server/domain/compensation";
import { COUNTRIES } from "@/server/domain/countries";
import { NotFoundError } from "@/server/services/errors";

export const dynamic = "force-dynamic";

// Server component: reads straight from the service layer; actions are a small client island.
export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const { employees } = services();
  let employee;
  try {
    employee = employees.get(id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const history = employees.history(id);
  const tenure = tenureYears(employee.hireDate);
  const lastRaise = history.find((h) => h.reason !== "hire" && h.previousSalary !== null);

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-slate-500 hover:underline">← All employees</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{employee.fullName}</h1>
            {employee.status === "inactive" && <Badge className="bg-slate-200 text-slate-700">Inactive</Badge>}
          </div>
          <p className="text-sm text-slate-500">
            {employee.jobTitle} · {employee.department} · {COUNTRIES[employee.country].name}
          </p>
          <p className="text-xs text-slate-400">{employee.employeeCode} · {employee.email} · {GENDER_LABELS[employee.gender]}</p>
        </div>
        <EmployeeActions employee={JSON.parse(JSON.stringify(employee))} lastChangeDate={history[0]?.effectiveDate ?? employee.hireDate} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 md:col-span-2">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-sm text-slate-500">Current annual salary</p>
              <p className="text-3xl font-semibold tabular-nums">{money(employee.salary, employee.currency)}</p>
            </div>
            <CompaBadge compa={employee.compaRatio} position={employee.bandPosition} />
          </div>
          <div className="mt-6">
            {employee.band ? (
              <>
                <p className="mb-2 text-sm font-medium text-slate-700">Pay band for {employee.jobTitle} in {COUNTRIES[employee.country].name}</p>
                <BandBar band={employee.band} salary={employee.salary} currency={employee.currency} />
              </>
            ) : (
              <p className="text-sm text-slate-500">
                No pay band is defined for this job title in this country. <Link className="underline" href="/bands">Pay bands</Link>
              </p>
            )}
          </div>
        </Card>
        <Card className="divide-y divide-slate-100">
          <Metric label="Compa-ratio" value={employee.compaRatio?.toFixed(2) ?? "–"} hint="Salary ÷ band midpoint" />
          <Metric
            label="Range penetration"
            value={employee.band ? percent(rangePenetration(employee.salary, employee.band) * 100, 0) : "–"}
            hint="0% = band minimum, 100% = maximum"
          />
          <Metric label="Tenure" value={`${tenure} ${tenure === 1 ? "year" : "years"}`} hint={`Hired ${employee.hireDate}`} />
          <Metric label="Last increase" value={lastRaise ? lastRaise.effectiveDate : "None yet"} hint={lastRaise ? REASON_LABELS[lastRaise.reason] : undefined} />
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Salary history</h2>
        <Card>
          <ol className="divide-y divide-slate-100">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div>
                  <p className="font-medium">{REASON_LABELS[h.reason]}</p>
                  <p className="text-xs text-slate-500">Effective {h.effectiveDate}{h.note ? ` · ${h.note}` : ""}</p>
                </div>
                <div className="text-right tabular-nums">
                  <p className="font-medium">{money(h.newSalary, employee.currency)}</p>
                  {h.previousSalary !== null && (
                    <p className={`text-xs ${h.newSalary >= h.previousSalary ? "text-emerald-700" : "text-amber-700"}`}>
                      {signedPercent(changePercent(h.previousSalary, h.newSalary))} from {money(h.previousSalary, employee.currency)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-5 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
