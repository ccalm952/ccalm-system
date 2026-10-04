import { describe, expect, it } from "vitest";

import { createEmptyEmployee, normalizeSalarySheet } from "./defaults";

describe("salary employee ids", () => {
  it("creates an id that does not collide with default employees", () => {
    const sheet = normalizeSalarySheet(null, "2026-10");
    const employee = createEmptyEmployee();

    expect(sheet.employees.some((row) => row.id === employee.id)).toBe(false);
  });

  it("replaces duplicate ids while normalizing saved data", () => {
    const sheet = normalizeSalarySheet(null, "2026-10");
    sheet.employees[1] = {
      ...sheet.employees[1],
      id: sheet.employees[0].id,
    };

    const normalized = normalizeSalarySheet(sheet, "2026-10");
    const ids = normalized.employees.map((row) => row.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
