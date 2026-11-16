"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Employee, type Meta, type Page } from "@/lib/api";
import { money } from "@/lib/format";
import { CompaBadge } from "./Compa";
import { EmployeeForm } from "./EmployeeForm";
import { Button, Input, Select, Table, Td, Th } from "./ui";

const FILTERS = ["search", "country", "department", "jobTitle", "band", "status"] as const;

/** The URL is the single source of truth for filters, so any view can be bookmarked or linked from Insights. */
export function EmployeesView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [data, setData] = useState<Page<Employee> | null>(null);
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const sort = params.get("sort") ?? "name";
  const order = params.get("order") ?? "asc";
  const page = Number(params.get("page") ?? 1);

  function update(changes: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (resetPage) next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  useEffect(() => {
    api.meta().then(setMeta).catch(() => setError("Could not load filter options"));
  }, []);

  // Wait for typing to pause before updating the URL (and so the API).
  useEffect(() => {
    if (search === (params.get("search") ?? "")) return;
    const t = setTimeout(() => update({ search: search.trim() || null }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const q = new URLSearchParams(params);
    q.set("pageSize", "25");
    let cancelled = false;
    api
      .listEmployees(q)
      .then((d) => !cancelled && (setData(d), setError("")))
      .catch(() => !cancelled && setError("Could not load employees"));
    return () => {
      cancelled = true;
    };
  }, [params]);

  const sortBy = (key: string) => update({ sort: key, order: sort === key && order === "asc" ? "desc" : "asc" });
  const arrow = (key: string) => (sort === key ? (order === "asc" ? " ↑" : " ↓") : "");
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const activeFilters = FILTERS.filter((f) => params.get(f)).length;
  const exportParams = new URLSearchParams(params);
  exportParams.delete("page");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-slate-500">
            {data ? `${data.total.toLocaleString()} ${params.get("status") === "all" ? "" : (params.get("status") ?? "active") + " "}employees` : "Loading…"}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/employees/export?${exportParams}`}>
            <Button variant="secondary">Export CSV</Button>
          </a>
          <Button onClick={() => setAdding(true)} disabled={!meta}>
            Add employee
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <Input className="col-span-2 w-full" placeholder="Search name, email or code" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        <Select value={params.get("country") ?? ""} onChange={(e) => update({ country: e.target.value })} aria-label="Country">
          <option value="">All countries</option>
          {meta?.countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
        <Select value={params.get("jobTitle") ?? ""} onChange={(e) => update({ jobTitle: e.target.value })} aria-label="Job title">
          <option value="">All job titles</option>
          {meta?.jobTitles.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <Select value={params.get("band") ?? ""} onChange={(e) => update({ band: e.target.value })} aria-label="Band position">
          <option value="">Any band position</option>
          <option value="below">Below band</option>
          <option value="within">Within band</option>
          <option value="above">Above band</option>
          <option value="none">No band defined</option>
        </Select>
        <Select value={params.get("status") ?? "active"} onChange={(e) => update({ status: e.target.value === "active" ? null : e.target.value })} aria-label="Status">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All statuses</option>
        </Select>
      </div>
      {activeFilters > 0 && (
        <button className="text-sm text-slate-600 underline" onClick={() => { setSearch(""); router.replace(pathname); }}>
          Clear filters
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Table
        head={
          <tr>
            <Th className="cursor-pointer select-none"><span onClick={() => sortBy("name")}>Name{arrow("name")}</span></Th>
            <Th>Job title</Th>
            <Th>Country</Th>
            <Th className="cursor-pointer select-none"><span onClick={() => sortBy("hireDate")}>Hired{arrow("hireDate")}</span></Th>
            <Th right className="cursor-pointer select-none"><span onClick={() => sortBy("salary")}>Salary{arrow("salary")}</span></Th>
            <Th right className="cursor-pointer select-none"><span onClick={() => sortBy("compa")} title="Salary ÷ band midpoint">Compa-ratio{arrow("compa")}</span></Th>
          </tr>
        }
      >
        {data?.items.map((e) => (
          <tr key={e.id} className={`hover:bg-slate-50 ${e.status === "inactive" ? "text-slate-400" : ""}`}>
            <Td>
              <Link href={`/employees/${e.id}`} className="font-medium hover:underline">{e.fullName}</Link>
              <div className="text-xs text-slate-500">{e.employeeCode} · {e.department}</div>
            </Td>
            <Td>{e.jobTitle}</Td>
            <Td>{meta?.countries.find((c) => c.code === e.country)?.name ?? e.country}</Td>
            <Td className="text-slate-600 tabular-nums">{e.hireDate}</Td>
            <Td right className="font-medium">{money(e.salary, e.currency)}</Td>
            <Td right><CompaBadge compa={e.compaRatio} position={e.bandPosition} /></Td>
          </tr>
        ))}
        {data?.items.length === 0 && (
          <tr><Td colSpan={6} className="py-10 text-center text-slate-500">No employees match these filters.</Td></tr>
        )}
      </Table>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>Page {page} of {pages}</span>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) }, false)}>Previous</Button>
          <Button variant="secondary" disabled={page >= pages} onClick={() => update({ page: String(page + 1) }, false)}>Next</Button>
        </div>
      </div>

      {adding && meta && (
        <EmployeeForm meta={meta} onClose={() => setAdding(false)} onSaved={(e) => router.push(`/employees/${e.id}`)} />
      )}
    </div>
  );
}
