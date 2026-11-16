"use client";

import { useState } from "react";
import { api, ApiError, type Employee, type Meta } from "@/lib/api";
import { GENDER_LABELS } from "@/lib/format";
import { Button, Dialog, Field, Input, Select } from "./ui";

interface Props {
  meta: Meta;
  employee?: Employee; // omitted = add a new employee
  onClose: () => void;
  onSaved: (e: Employee) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Add an employee (with starting salary) or edit an existing profile. Salary changes have their own form. */
export function EmployeeForm({ meta, employee, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    fullName: employee?.fullName ?? "",
    email: employee?.email ?? "",
    jobTitle: employee?.jobTitle ?? "",
    department: employee?.department ?? "",
    country: employee?.country ?? "US",
    gender: employee?.gender ?? "undisclosed",
    hireDate: employee?.hireDate ?? "",
    salary: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const currency = meta.countries.find((c) => c.code === form.country)?.currency;
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const { salary, ...profile } = form;
      onSaved(employee ? await api.updateEmployee(employee.id, { ...profile, version: employee.version }) : await api.createEmployee({ ...profile, salary }));
    } catch (err) {
      const fields = err instanceof ApiError ? err.fieldErrors : {};
      setErrors(Object.keys(fields).length ? fields : { form: err instanceof Error ? err.message : "Could not save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog title={employee ? `Edit ${employee.fullName}` : "Add employee"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full name" error={errors.fullName}>
            <Input value={form.fullName} onChange={set("fullName")} autoFocus />
          </Field>
          <Field label="Work email" error={errors.email}>
            <Input type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Job title" error={errors.jobTitle} hint="Pick an existing title so the right pay band applies">
            <Input value={form.jobTitle} onChange={set("jobTitle")} list="job-titles" />
          </Field>
          <Field label="Department" error={errors.department}>
            <Input value={form.department} onChange={set("department")} list="departments" />
          </Field>
          <Field label="Country" error={errors.country}>
            <Select value={form.country} onChange={set("country")}>
              {meta.countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Gender" error={errors.gender} hint="Used only for aggregated pay equity reports">
            <Select value={form.gender} onChange={set("gender")}>
              {meta.genders.map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABELS[g]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hire date" error={errors.hireDate}>
            <Input type="date" max={today()} value={form.hireDate} onChange={set("hireDate")} />
          </Field>
          {!employee && (
            <Field label={`Starting annual salary (${currency})`} error={errors.salary}>
              <Input type="number" min="1" step="100" value={form.salary} onChange={set("salary")} />
            </Field>
          )}
        </div>
        <datalist id="job-titles">{meta.jobTitles.map((t) => <option key={t} value={t} />)}</datalist>
        <datalist id="departments">{meta.departments.map((d) => <option key={d} value={d} />)}</datalist>
        {employee && <p className="text-xs text-slate-500">To change the salary, use “Change salary” on the employee page so the change is recorded in the history.</p>}
        {errors.form && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : employee ? "Save changes" : "Add employee"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
