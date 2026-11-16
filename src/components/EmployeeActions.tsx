"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, type Employee, type Meta } from "@/lib/api";
import { EmployeeForm } from "./EmployeeForm";
import { SalaryChangeForm } from "./SalaryChangeForm";
import { Button } from "./ui";

export function EmployeeActions({ employee, lastChangeDate }: { employee: Employee; lastChangeDate: string }) {
  const router = useRouter();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [open, setOpen] = useState<"edit" | "salary" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.meta().then(setMeta).catch(() => setError("Could not load form options"));
  }, []);

  const done = () => {
    setOpen(null);
    router.refresh();
  };

  async function toggleStatus() {
    const next = employee.status === "active" ? "inactive" : "active";
    if (next === "inactive" && !window.confirm(`Deactivate ${employee.fullName}? Their record and salary history are kept.`)) return;
    try {
      await api.setStatus(employee.id, next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update status");
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {employee.status === "active" && (
          <Button onClick={() => setOpen("salary")} disabled={!meta}>Change salary</Button>
        )}
        <Button variant="secondary" onClick={() => setOpen("edit")} disabled={!meta}>Edit profile</Button>
        <Button variant={employee.status === "active" ? "danger" : "secondary"} onClick={toggleStatus}>
          {employee.status === "active" ? "Deactivate" : "Reactivate"}
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {meta && open === "edit" && <EmployeeForm meta={meta} employee={employee} onClose={() => setOpen(null)} onSaved={done} />}
      {meta && open === "salary" && (
        <SalaryChangeForm meta={meta} employee={employee} lastChangeDate={lastChangeDate} onClose={() => setOpen(null)} onSaved={done} />
      )}
    </div>
  );
}
