import { defaultDatabasePath, openDatabase } from "../src/server/db/connection";
import { BandRepository } from "../src/server/repositories/bandRepository";
import { EmployeeRepository } from "../src/server/repositories/employeeRepository";
import { generateDataset } from "../src/server/seed/generate";

// Usage: npm run seed                 -> resets and seeds 10,000 employees with salary history and bands
//        npm run seed -- 500          -> custom count
//        npm run seed -- --if-empty   -> only seeds a fresh database (used when a deploy starts)
const args = process.argv.slice(2);
const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 10_000);
const file = defaultDatabasePath();
const db = openDatabase(file);
const employees = new EmployeeRepository(db);
const bands = new BandRepository(db);

if (args.includes("--if-empty") && employees.count() > 0) {
  console.log(`Database already has ${employees.count().toLocaleString()} employees, skipping seed`);
  process.exit(0);
}

const started = performance.now();
const data = generateDataset(count);
db.transaction(() => {
  db.exec("DELETE FROM salary_changes; DELETE FROM employees; DELETE FROM salary_bands; DELETE FROM sqlite_sequence;");
  for (const band of data.bands) bands.upsert(band);
  for (const { employee, history } of data.employees) {
    const { id } = employees.create(employee);
    for (const change of history) employees.addSalaryChange({ employeeId: id, ...change });
  }
})();
const changes = data.employees.reduce((n, e) => n + e.history.length, 0);
console.log(
  `Seeded ${employees.count().toLocaleString()} employees, ${changes.toLocaleString()} salary changes and ` +
    `${data.bands.length} bands into ${file} in ${Math.round(performance.now() - started)} ms`,
);
