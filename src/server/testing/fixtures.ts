import { openDatabase } from "../db/connection";
import type { EmployeeCreate } from "../domain/schemas";
import { BandRepository } from "../repositories/bandRepository";
import { EmployeeRepository } from "../repositories/employeeRepository";

export function testDb() {
  const db = openDatabase(":memory:");
  return { db, employees: new EmployeeRepository(db), bands: new BandRepository(db) };
}

let n = 0;
export function makeEmployee(over: Partial<EmployeeCreate> = {}): EmployeeCreate {
  n += 1;
  return {
    fullName: `Person ${n}`,
    email: `person${n}@acme.com`,
    jobTitle: "Software Engineer",
    department: "Engineering",
    country: "GB",
    gender: "undisclosed",
    hireDate: "2022-01-10",
    salary: 60_000,
    ...over,
  };
}
