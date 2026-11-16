import { Suspense } from "react";
import { EmployeesView } from "@/components/EmployeesView";

export default function EmployeesPage() {
  return (
    <Suspense>
      <EmployeesView />
    </Suspense>
  );
}
