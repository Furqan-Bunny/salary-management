import Link from "next/link";
import type { ReactNode } from "react";
import { CountryPicker } from "@/components/CountryPicker";
import { Badge, Card, Table, Td, Th } from "@/components/ui";
import { compactMoney, money, percent } from "@/lib/format";
import { services } from "@/server/container";
import { COUNTRIES, isCountryCode } from "@/server/domain/countries";
import { MIN_GROUP_SIZE, PAY_GAP_THRESHOLD } from "@/server/services/insightsService";

export const dynamic = "force-dynamic";

// Server component: computed from the service layer on the server, no client-side data fetching.
export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const { insights } = services();
  const overview = insights.overview();
  const byCountry = insights.byCountry();
  const health = insights.bandHealth();
  const requested = (await searchParams).country;
  const country = isCountryCode(requested) ? requested : (byCountry[0]?.country ?? "US");
  const { name: countryName, currency } = COUNTRIES[country];
  const equity = insights.payEquity(country);
  const compression = insights.compression(country);
  const titles = insights.byJobTitle(country);
  const departments = insights.byDepartment(country);
  const maxMedianUsd = Math.max(1, ...byCountry.map((c) => c.medianUsd));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">How ACME pays people</h1>
        <p className="text-sm text-slate-500">Active employees only. Country figures are in local currency; USD uses fixed planning rates.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active employees" value={overview.headcount.toLocaleString()} />
        <Stat label="Countries" value={String(overview.countries)} />
        <Stat label="Annual payroll (USD)" value={compactMoney(overview.payrollUsd, "USD")} />
        <Stat label="Paid outside their band" value={percent(overview.outOfBandPercent)} href="#band-health" hint="Breakdown by country" />
      </div>

      <Section title="Salary by country" subtitle="What we pay, in each country's currency. The bar compares medians in USD.">
        <Table
          head={
            <tr>
              <Th>Country</Th><Th right>People</Th><Th right>Minimum</Th><Th right>Median</Th><Th right>Average</Th><Th right>Maximum</Th><Th className="w-48">Median in USD</Th>
            </tr>
          }
        >
          {byCountry.map((c) => (
            <tr key={c.country}>
              <Td><Link className="font-medium hover:underline" href={`/insights?country=${c.country}`}>{c.countryName}</Link></Td>
              <Td right>{c.count.toLocaleString()}</Td>
              <Td right>{money(c.min, c.currency)}</Td>
              <Td right className="font-medium">{money(c.median, c.currency)}</Td>
              <Td right>{money(c.average, c.currency)}</Td>
              <Td right>{money(c.max, c.currency)}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded bg-slate-800" style={{ width: `${(c.medianUsd / maxMedianUsd) * 100}%` }} />
                  <span className="text-xs tabular-nums text-slate-500">{compactMoney(c.medianUsd, "USD")}</span>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section id="band-health" title="Band health" subtitle="Is pay consistent with our own pay structure? Click a number to see those people.">
        <Card className="divide-y divide-slate-100">
          {health.map((h) => {
            const total = h.below + h.within + h.above + h.noBand;
            const link = (band: string, n: number, cls: string) =>
              n > 0 ? <Link className={`hover:underline ${cls}`} href={`/?country=${h.country}&band=${band}`}>{n.toLocaleString()}</Link> : <span className="text-slate-300">0</span>;
            return (
              <div key={h.country} className="grid grid-cols-12 items-center gap-3 px-5 py-3 text-sm">
                <span className="col-span-3 font-medium">{COUNTRIES[h.country].name}</span>
                <div className="col-span-5 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="bg-amber-400" style={{ width: `${(h.below / total) * 100}%` }} />
                  <div className="bg-emerald-400" style={{ width: `${(h.within / total) * 100}%` }} />
                  <div className="bg-sky-400" style={{ width: `${(h.above / total) * 100}%` }} />
                </div>
                <span className="col-span-4 flex justify-end gap-4 text-xs tabular-nums text-slate-600">
                  <span>below {link("below", h.below, "text-amber-700")}</span>
                  <span>within {link("within", h.within, "text-emerald-700")}</span>
                  <span>above {link("above", h.above, "text-sky-700")}</span>
                </span>
              </div>
            );
          })}
        </Card>
      </Section>

      <div className="sticky top-0 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
        <h2 className="text-xl font-semibold">Deep dive: {countryName}</h2>
        <CountryPicker value={country} options={byCountry.map((c) => ({ code: c.country, name: c.countryName }))} />
      </div>

      <Section
        title="Gender pay gap by job title"
        subtitle={`Median pay gap between men and women (positive = women paid less). Flagged at ${PAY_GAP_THRESHOLD}%, the EU Pay Transparency Directive threshold. Roles with fewer than ${MIN_GROUP_SIZE} women or men are hidden.`}
      >
        <Table head={<tr><Th>Job title</Th><Th right>Women</Th><Th right>Men</Th><Th right>Women median</Th><Th right>Men median</Th><Th right>Gap</Th></tr>}>
          {equity.map((r) => (
            <tr key={r.jobTitle} className={r.flagged ? "bg-red-50/60" : ""}>
              <Td className="font-medium">
                <Link className="hover:underline" href={`/?country=${country}&jobTitle=${encodeURIComponent(r.jobTitle)}`}>{r.jobTitle}</Link>
              </Td>
              <Td right>{r.women}</Td>
              <Td right>{r.men}</Td>
              <Td right>{money(r.womenMedian, currency)}</Td>
              <Td right>{money(r.menMedian, currency)}</Td>
              <Td right>
                <Badge className={r.flagged ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700"}>{percent(r.gapPercent)}</Badge>
              </Td>
            </tr>
          ))}
          {equity.length === 0 && <Empty cols={6}>No role in {countryName} has at least {MIN_GROUP_SIZE} women and {MIN_GROUP_SIZE} men.</Empty>}
        </Table>
      </Section>

      <Section
        title="Pay compression"
        subtitle="Are people hired in the last year placed higher in the band than people with 3+ years in the same role? Compared by median compa-ratio; flagged when recent hires are 0.03 or more ahead."
      >
        <Table head={<tr><Th>Job title</Th><Th right>Recent hires</Th><Th right>Median compa</Th><Th right>Tenured (3y+)</Th><Th right>Median compa</Th><Th right>Status</Th></tr>}>
          {compression.map((r) => (
            <tr key={r.jobTitle} className={r.flagged ? "bg-amber-50/70" : ""}>
              <Td className="font-medium">{r.jobTitle}</Td>
              <Td right>{r.recentHires}</Td>
              <Td right>{r.recentMedianCompa.toFixed(2)}</Td>
              <Td right>{r.tenured}</Td>
              <Td right>{r.tenuredMedianCompa.toFixed(2)}</Td>
              <Td right>{r.flagged ? <Badge className="bg-amber-100 text-amber-800">Compressed</Badge> : <span className="text-xs text-slate-400">OK</span>}</Td>
            </tr>
          ))}
          {compression.length === 0 && <Empty cols={6}>Not enough recent and tenured people in the same roles to compare.</Empty>}
        </Table>
      </Section>

      <Section title={`Salary by job title in ${countryName}`} subtitle="Median pay against the band, and how close the role sits to its midpoint on average.">
        <Table head={<tr><Th>Job title</Th><Th right>People</Th><Th right>Median</Th><Th right>Band min</Th><Th right>Band mid</Th><Th right>Band max</Th><Th right>Avg compa</Th></tr>}>
          {titles.map((t) => (
            <tr key={t.jobTitle}>
              <Td className="font-medium">
                <Link className="hover:underline" href={`/?country=${country}&jobTitle=${encodeURIComponent(t.jobTitle)}`}>{t.jobTitle}</Link>
              </Td>
              <Td right>{t.count}</Td>
              <Td right className="font-medium">{money(t.median, currency)}</Td>
              <Td right className="text-slate-500">{t.band ? money(t.band.min, currency) : "–"}</Td>
              <Td right className="text-slate-500">{t.band ? money(t.band.mid, currency) : "–"}</Td>
              <Td right className="text-slate-500">{t.band ? money(t.band.max, currency) : "–"}</Td>
              <Td right>{t.averageCompaRatio?.toFixed(2) ?? "–"}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title={`Departments in ${countryName}`}>
        <Table head={<tr><Th>Department</Th><Th right>People</Th><Th right>Median salary</Th><Th right>Annual payroll</Th></tr>}>
          {departments.map((d) => (
            <tr key={d.department}>
              <Td className="font-medium">{d.department}</Td>
              <Td right>{d.count}</Td>
              <Td right>{money(d.median, currency)}</Td>
              <Td right>{money(d.payroll, currency)}</Td>
            </tr>
          ))}
        </Table>
      </Section>
    </div>
  );
}

function Section({ id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && <p className="max-w-3xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, href, hint }: { label: string; value: string; href?: string; hint?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {href && <Link href={href} className="text-xs text-slate-500 underline">{hint}</Link>}
    </Card>
  );
}

function Empty({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <Td colSpan={cols} className="py-8 text-center text-slate-500">{children}</Td>
    </tr>
  );
}
