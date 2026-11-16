// Integration tests: real route handlers, real services, in-memory SQLite.
import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/server/db/connection";
import { BandRepository } from "@/server/repositories/bandRepository";
import * as bandItem from "./bands/[id]/route";
import * as bands from "./bands/route";
import * as employeeItem from "./employees/[id]/route";
import * as salary from "./employees/[id]/salary/route";
import * as status from "./employees/[id]/status/route";
import * as exportCsv from "./employees/export/route";
import * as employees from "./employees/route";
import * as insights from "./insights/route";
import * as meta from "./meta/route";

const BASE = "http://test.local";
const get = (path: string) => new Request(BASE + path);
const send = (method: string, path: string, body: unknown) =>
  new Request(BASE + path, { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
const ctx = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });

const newHire = {
  fullName: "Ada Lovelace",
  email: "ada@acme.com",
  jobTitle: "Software Engineer",
  department: "Engineering",
  country: "GB",
  gender: "female",
  hireDate: "2023-04-01",
  salary: 60000,
};

beforeEach(() => {
  const db = openDatabase(":memory:");
  (globalThis as { salaryDb?: unknown }).salaryDb = db;
  new BandRepository(db).upsert({ country: "GB", jobTitle: "Software Engineer", min: 50_000, mid: 60_000, max: 70_000 });
});

async function createAda() {
  const res = await employees.POST(send("POST", "/api/employees", newHire));
  return (await res.json()) as { id: number; version: number };
}

describe("employees API", () => {
  it("creates an employee (201) and lists it with compa-ratio", async () => {
    const res = await employees.POST(send("POST", "/api/employees", newHire));
    expect(res.status).toBe(201);
    const list = await (await employees.GET(get("/api/employees?search=ada"))).json();
    expect(list.total).toBe(1);
    expect(list.items[0]).toMatchObject({ fullName: "Ada Lovelace", currency: "GBP", compaRatio: 1, bandPosition: "within" });
  });

  it("returns 400 with field errors for invalid input and for malformed JSON", async () => {
    const res = await employees.POST(send("POST", "/api/employees", { ...newHire, salary: -5, email: "x" }));
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors).toMatchObject({ salary: expect.any(String), email: "Email is not valid" });

    const bad = await employees.POST(new Request(BASE + "/api/employees", { method: "POST", body: "{nope" }));
    expect(bad.status).toBe(400);
  });

  it("returns 404 for unknown or malformed ids", async () => {
    expect((await employeeItem.GET(get("/api/employees/999"), ctx(999))).status).toBe(404);
    expect((await employeeItem.GET(get("/api/employees/abc"), ctx("abc"))).status).toBe(404);
  });

  it("returns 409 when a profile edit is based on a stale version", async () => {
    const ada = await createAda();
    const { salary: _s, ...profile } = newHire;
    const first = await employeeItem.PATCH(send("PATCH", "/", { ...profile, fullName: "Ada K", version: ada.version }), ctx(ada.id));
    expect(first.status).toBe(200);
    const stale = await employeeItem.PATCH(send("PATCH", "/", { ...profile, fullName: "Ada L", version: ada.version }), ctx(ada.id));
    expect(stale.status).toBe(409);
  });

  it("records a salary change and returns it in the history, newest first", async () => {
    const ada = await createAda();
    const res = await salary.POST(
      send("POST", "/", { newSalary: 66000, effectiveDate: "2024-04-01", reason: "merit", note: "Annual review" }),
      ctx(ada.id),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ changePercent: 10, previousSalary: 60000, employee: { salary: 66000 } });
    const history = await (await salary.GET(get("/"), ctx(ada.id))).json();
    expect(history.map((h: { reason: string }) => h.reason)).toEqual(["merit", "hire"]);
  });

  it("deactivates and reactivates, and blocks salary changes while inactive", async () => {
    const ada = await createAda();
    expect((await (await status.PUT(send("PUT", "/", { status: "inactive" }), ctx(ada.id))).json()).status).toBe("inactive");
    const blocked = await salary.POST(send("POST", "/", { newSalary: 70000, effectiveDate: "2024-04-01", reason: "merit" }), ctx(ada.id));
    expect(blocked.status).toBe(409);
    expect((await status.PUT(send("PUT", "/", { status: "gone" }), ctx(ada.id))).status).toBe(400);
  });

  it("exports the filtered list as a CSV download", async () => {
    await createAda();
    const res = await exportCsv.GET(get("/api/employees/export?country=GB"));
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect((await res.text()).split("\n")[1]).toContain("Ada Lovelace");
  });
});

describe("bands API", () => {
  it("lists bands for a country and validates updates", async () => {
    const list = await (await bands.GET(get("/api/bands?country=GB"))).json();
    expect(list).toHaveLength(1);
    const id = list[0].id;
    expect((await bandItem.PUT(send("PUT", "/", { min: 52000, mid: 61000, max: 72000 }), ctx(id))).status).toBe(200);
    expect((await bandItem.PUT(send("PUT", "/", { min: 9, mid: 5, max: 10 }), ctx(id))).status).toBe(400);
  });
});

describe("insights and meta API", () => {
  it("returns the org view plus the breakdowns for the selected country", async () => {
    await createAda();
    const body = await (await insights.GET(get("/api/insights?country=GB"))).json();
    expect(body.overview).toMatchObject({ headcount: 1, countries: 1 });
    expect(body.country).toBe("GB");
    expect(Object.keys(body)).toEqual(
      expect.arrayContaining(["byCountry", "bandHealth", "byJobTitle", "payEquity", "compression", "byDepartment"]),
    );
  });

  it("returns the options the forms need", async () => {
    await createAda();
    const body = await (await meta.GET()).json();
    expect(body.countries).toHaveLength(8);
    expect(body.jobTitles).toEqual(["Software Engineer"]);
    expect(body.reasons).toContain("promotion");
  });
});
