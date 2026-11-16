import { describe, expect, it } from "vitest";
import { bandSchema, employeeCreateSchema, employeeUpdateSchema, salaryChangeSchema } from "./schemas";

const TODAY = new Date().toISOString().slice(0, 10);

const valid = {
  fullName: "  Ada Lovelace ",
  email: "ADA@acme.com",
  jobTitle: "Software Engineer",
  department: "Engineering",
  country: "GB",
  gender: "female",
  hireDate: "2023-04-01",
  salary: "85000",
};

const firstMessage = (r: { success: boolean; error?: { issues: { message: string }[] } }) => r.error?.issues[0].message;

describe("employeeCreateSchema", () => {
  it("trims text, lowercases email and parses salary to an integer", () => {
    const parsed = employeeCreateSchema.parse(valid);
    expect(parsed).toMatchObject({ fullName: "Ada Lovelace", email: "ada@acme.com", salary: 85000 });
  });

  it("rejects a salary that is zero, negative or has decimals", () => {
    expect(firstMessage(employeeCreateSchema.safeParse({ ...valid, salary: 0 }))).toBe("Salary must be greater than zero");
    expect(employeeCreateSchema.safeParse({ ...valid, salary: -1 }).success).toBe(false);
    expect(firstMessage(employeeCreateSchema.safeParse({ ...valid, salary: 100.5 }))).toBe(
      "Salary must be a whole number",
    );
  });

  it("rejects an invalid email and an unsupported country", () => {
    expect(firstMessage(employeeCreateSchema.safeParse({ ...valid, email: "nope" }))).toBe("Email is not valid");
    expect(firstMessage(employeeCreateSchema.safeParse({ ...valid, country: "XX" }))).toBe("Country is not supported");
  });

  it("rejects a hire date in the future or a malformed date", () => {
    expect(firstMessage(employeeCreateSchema.safeParse({ ...valid, hireDate: "2999-01-01" }))).toBe(
      "Hire date cannot be in the future",
    );
    expect(firstMessage(employeeCreateSchema.safeParse({ ...valid, hireDate: "" }))).toBe("Hire date is required");
    expect(employeeCreateSchema.safeParse({ ...valid, hireDate: "2023-13-45" }).success).toBe(false);
  });

  it("accepts today as a hire date", () => {
    expect(employeeCreateSchema.safeParse({ ...valid, hireDate: TODAY }).success).toBe(true);
  });

  it("only accepts known gender values, defaulting to undisclosed", () => {
    expect(employeeCreateSchema.parse({ ...valid, gender: undefined }).gender).toBe("undisclosed");
    expect(employeeCreateSchema.safeParse({ ...valid, gender: "x" }).success).toBe(false);
  });
});

describe("employeeUpdateSchema", () => {
  it("requires the version being edited and does not accept salary", () => {
    const { salary: _salary, ...profile } = valid;
    expect(employeeUpdateSchema.safeParse(profile).success).toBe(false);
    const parsed = employeeUpdateSchema.parse({ ...profile, salary: 1, version: 3 });
    expect(parsed.version).toBe(3);
    expect("salary" in parsed).toBe(false);
  });
});

describe("salaryChangeSchema", () => {
  const change = { newSalary: "90000", effectiveDate: "2025-01-01", reason: "merit" };

  it("accepts a valid change with an optional note", () => {
    expect(salaryChangeSchema.parse({ ...change, note: " annual review " })).toMatchObject({
      newSalary: 90000,
      note: "annual review",
    });
  });

  it("does not allow 'hire' as a manual reason", () => {
    expect(firstMessage(salaryChangeSchema.safeParse({ ...change, reason: "hire" }))).toBe(
      "Choose a reason for the change",
    );
  });
});

describe("bandSchema", () => {
  it("requires min < mid < max", () => {
    expect(bandSchema.safeParse({ min: 1, mid: 2, max: 3 }).success).toBe(true);
    expect(firstMessage(bandSchema.safeParse({ min: 5, mid: 2, max: 3 }))).toBe(
      "Band must satisfy minimum < midpoint < maximum",
    );
  });
});
