"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type Meta, type SalaryBand } from "@/lib/api";
import { money } from "@/lib/format";
import { Button, Input, Select, Table, Td, Th } from "./ui";

export function BandsEditor() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [country, setCountry] = useState("US");
  const [bands, setBands] = useState<SalaryBand[]>([]);
  const [editing, setEditing] = useState<{ id: number; min: string; mid: string; max: string } | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    api.meta().then(setMeta).catch(() => setMessage({ kind: "error", text: "Could not load countries" }));
  }, []);

  useEffect(() => {
    api.listBands(country).then(setBands).catch(() => setMessage({ kind: "error", text: "Could not load bands" }));
  }, [country]);

  async function save() {
    if (!editing) return;
    try {
      const saved = await api.updateBand(editing.id, editing);
      setBands((list) => list.map((b) => (b.id === saved.id ? saved : b)));
      setMessage({ kind: "ok", text: `Saved band for ${saved.jobTitle}. Compa-ratios update immediately.` });
      setEditing(null);
    } catch (err) {
      const text = err instanceof ApiError ? Object.values(err.fieldErrors)[0] ?? err.message : "Could not save";
      setMessage({ kind: "error", text });
    }
  }

  const currency = meta?.countries.find((c) => c.code === country)?.currency ?? "USD";
  const field = (key: "min" | "mid" | "max") => (
    <Input
      className="w-32 text-right"
      type="number"
      step="100"
      value={editing![key]}
      onChange={(e) => setEditing((s) => s && { ...s, [key]: e.target.value })}
      aria-label={key}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pay bands</h1>
          <p className="max-w-2xl text-sm text-slate-500">
            ACME&apos;s pay structure: the minimum, midpoint and maximum annual salary for each job title in each country.
            Compa-ratio and band position across the app are measured against these.
          </p>
        </div>
        <Select className="w-60" value={country} onChange={(e) => { setCountry(e.target.value); setEditing(null); }} aria-label="Country">
          {meta?.countries.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>)}
        </Select>
      </div>

      {message && (
        <p className={`rounded-md px-3 py-2 text-sm ${message.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>
      )}

      <Table head={<tr><Th>Job title</Th><Th right>Minimum</Th><Th right>Midpoint</Th><Th right>Maximum</Th><Th right>Spread</Th><Th /></tr>}>
        {bands.map((b) =>
          editing?.id === b.id ? (
            <tr key={b.id} className="bg-slate-50">
              <Td className="font-medium">{b.jobTitle}</Td>
              <Td right>{field("min")}</Td>
              <Td right>{field("mid")}</Td>
              <Td right>{field("max")}</Td>
              <Td />
              <Td right>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button onClick={save}>Save</Button>
                </div>
              </Td>
            </tr>
          ) : (
            <tr key={b.id}>
              <Td className="font-medium">{b.jobTitle}</Td>
              <Td right>{money(b.min, currency)}</Td>
              <Td right className="font-medium">{money(b.mid, currency)}</Td>
              <Td right>{money(b.max, currency)}</Td>
              <Td right className="text-slate-500">{Math.round(((b.max - b.min) / b.min) * 100)}%</Td>
              <Td right>
                <Button variant="ghost" onClick={() => { setMessage(null); setEditing({ id: b.id, min: String(b.min), mid: String(b.mid), max: String(b.max) }); }}>
                  Edit
                </Button>
              </Td>
            </tr>
          ),
        )}
      </Table>
    </div>
  );
}
