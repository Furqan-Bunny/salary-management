"use client";

import { useState } from "react";
import { api, ApiError, type Employee, type Meta } from "@/lib/api";
import { money, REASON_LABELS, signedPercent } from "@/lib/format";
import { Button, Dialog, Field, Input, Select, Textarea } from "./ui";

interface Props {
  meta: Meta;
  employee: Employee;
  lastChangeDate: string;
  onClose: () => void;
  onSaved: () => void;
}

/** A salary change is recorded as an event with a date and a reason, never as an overwrite. */
export function SalaryChangeForm({ meta, employee, lastChangeDate, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ newSalary: "", effectiveDate: new Date().toISOString().slice(0, 10), reason: "merit", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const proposed = Number(form.newSalary);
  const valid = Number.isFinite(proposed) && proposed > 0;
  const change = valid ? ((proposed - employee.salary) / employee.salary) * 100 : null;
  const band = employee.band;
  const bandWarning =
    valid && band
      ? proposed < band.min
        ? `Below the band minimum of ${money(band.min, employee.currency)}`
        : proposed > band.max
          ? `Above the band maximum of ${money(band.max, employee.currency)}`
          : null
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await api.changeSalary(employee.id, form);
      onSaved();
    } catch (err) {
      const fields = err instanceof ApiError ? err.fieldErrors : {};
      setErrors(Object.keys(fields).length ? fields : { form: err instanceof Error ? err.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog title={`Change salary for ${employee.fullName}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-slate-600">
          Current salary <span className="font-semibold text-slate-900">{money(employee.salary, employee.currency)}</span>
          {band && <> · band {money(band.min, employee.currency)} to {money(band.max, employee.currency)}</>}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={`New annual salary (${employee.currency})`}
            error={errors.newSalary}
            hint={change !== null && <span className={change < 0 ? "text-amber-700" : "text-emerald-700"}>{signedPercent(change)} vs current</span>}
          >
            <Input type="number" min="1" step="100" value={form.newSalary} onChange={set("newSalary")} autoFocus />
          </Field>
          <Field label="Effective date" error={errors.effectiveDate} hint={`On or after ${lastChangeDate}`}>
            <Input type="date" min={lastChangeDate} value={form.effectiveDate} onChange={set("effectiveDate")} />
          </Field>
        </div>
        {bandWarning && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {bandWarning}. You can still save it; it will show as out of band.
          </p>
        )}
        <Field label="Reason" error={errors.reason}>
          <Select value={form.reason} onChange={set("reason")}>
            {meta.reasons.map((r) => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
          </Select>
        </Field>
        <Field label="Note (optional)" error={errors.note}>
          <Textarea rows={2} value={form.note} onChange={set("note")} placeholder="e.g. 2026 annual review" />
        </Field>
        {errors.form && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Record change"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
