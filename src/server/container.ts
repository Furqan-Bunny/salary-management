import { getDb } from "./db/connection";
import { BandRepository } from "./repositories/bandRepository";
import { EmployeeRepository } from "./repositories/employeeRepository";
import { BandService } from "./services/bandService";
import { EmployeeService } from "./services/employeeService";
import { InsightsService } from "./services/insightsService";

// The one place real dependencies are wired. Tests build their own against an in-memory database.
export function services() {
  const db = getDb();
  const employees = new EmployeeRepository(db);
  return {
    employees: new EmployeeService(employees),
    bands: new BandService(new BandRepository(db)),
    insights: new InsightsService(employees),
  };
}
