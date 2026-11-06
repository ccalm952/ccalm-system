import { describe, expect, it } from "vitest";

import {
  createEmptyEmployee,
  createEmptyOtherInsured,
  normalizeSalarySheet,
  resolveDefaultSalarySheet,
} from "./defaults";
import type { SalaryInsuranceInput, SalarySheetData } from "./types";

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
    expect(normalized.employees[1].paySocialMedical).toBe(true);
  });
});

function storedInsurance(
  socialCount: number,
  medicalCount: number,
): SalaryInsuranceInput {
  return {
    pensionBase: 4043,
    pensionEmployerRate: 0.16,
    pensionEmployerCount: socialCount,
    pensionPersonalRate: 0.08,
    pensionPersonalCount: socialCount,
    unemploymentBase: 4043,
    unemploymentEmployerRate: 0.005,
    unemploymentEmployerCount: socialCount,
    unemploymentPersonalRate: 0.005,
    unemploymentPersonalCount: socialCount,
    injuryBase: 4414,
    injuryEmployerRate: 0.002,
    injuryEmployerCount: socialCount,
    medicalBase: 4433,
    medicalEmployerRate: 0.075,
    medicalEmployerCount: medicalCount,
    medicalPersonalRate: 0.02,
    medicalPersonalCount: medicalCount,
    maternityBase: 4433,
    maternityEmployerRate: 0.005,
    maternityEmployerCount: medicalCount,
  };
}

describe("交医社保与其他参保人员", () => {
  it("内置新表默认全部缴纳，人数等于员工数，公积金人数不变", () => {
    const sheet = normalizeSalarySheet(null, "2026-10");

    expect(sheet.employees).toHaveLength(9);
    expect(sheet.employees.every((row) => row.paySocialMedical)).toBe(true);
    expect(sheet.otherInsured).toEqual([]);
    expect(sheet.insuranceHeadcountAuto).toBe(true);
    expect(sheet.insurance.pensionEmployerCount).toBe(9);
    expect(sheet.insurance.pensionPersonalCount).toBe(9);
    expect(sheet.insurance.unemploymentEmployerCount).toBe(9);
    expect(sheet.insurance.injuryEmployerCount).toBe(9);
    expect(sheet.insurance.medicalEmployerCount).toBe(9);
    expect(sheet.insurance.medicalPersonalCount).toBe(9);
    expect(sheet.insurance.maternityEmployerCount).toBe(9);
    expect(sheet.housingFund.employerCount).toBe(5);
    expect(sheet.housingFund.personalCount).toBe(4);
    expect(createEmptyEmployee().paySocialMedical).toBe(true);
    expect(createEmptyOtherInsured()).toMatchObject({
      name: "",
      note: "",
      paySocial: true,
      payMedical: true,
    });
  });

  it("旧表缺少字段时视为缴纳，并保留原来的手填人数", () => {
    const base = normalizeSalarySheet(null, "2026-10");
    const legacy = {
      ...base,
      insuranceHeadcountAuto: undefined,
      otherInsured: undefined,
      insurance: storedInsurance(11, 12),
      employees: base.employees.map((row) => {
        const employee = { ...row };
        delete employee.paySocialMedical;
        return employee;
      }),
    };

    const normalized = normalizeSalarySheet(legacy, "2026-10");

    expect(normalized.insuranceHeadcountAuto).toBeUndefined();
    expect(normalized.otherInsured).toEqual([]);
    expect(normalized.employees.every((row) => row.paySocialMedical)).toBe(
      true,
    );
    expect(normalized.insurance.pensionEmployerCount).toBe(11);
    expect(normalized.insurance.pensionPersonalCount).toBe(11);
    expect(normalized.insurance.medicalEmployerCount).toBe(12);
    expect(normalized.insurance.medicalPersonalCount).toBe(12);
    expect(normalized.insurance.maternityEmployerCount).toBe(12);
    expect(normalized.housingFund).toEqual(base.housingFund);
  });

  it("规范化其他参保人员，缺省勾选视为缴纳", () => {
    const base = normalizeSalarySheet(null, "2026-10");
    const normalized = normalizeSalarySheet(
      {
        ...base,
        insuranceHeadcountAuto: true,
        insurance: storedInsurance(1, 1),
        otherInsured: [
          { id: "o1", name: "丙", note: "退休", paySocial: false },
          { id: "o1", name: "丁", payMedical: false, note: 1 },
          null,
          { name: "戊" },
        ],
      },
      "2026-10",
    );

    expect(normalized.otherInsured).toHaveLength(3);
    expect(normalized.otherInsured?.[0]).toEqual({
      id: "o1",
      name: "丙",
      note: "退休",
      paySocial: false,
      payMedical: true,
    });
    expect(normalized.otherInsured?.[1]).toMatchObject({
      name: "丁",
      note: "",
      paySocial: true,
      payMedical: false,
    });
    expect(normalized.otherInsured?.[1]?.id).not.toBe("o1");
    expect(normalized.otherInsured?.[2]).toMatchObject({
      name: "戊",
      note: "",
      paySocial: true,
      payMedical: true,
    });
    const ids = normalized.otherInsured?.map((row) => row.id) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
    expect(normalized.insurance.pensionEmployerCount).toBe(
      normalized.employees.length + 2,
    );
    expect(normalized.insurance.medicalEmployerCount).toBe(
      normalized.employees.length + 2,
    );
  });

  it("新月份沿用员工开关和其他参保人员，并按人员重算人数", () => {
    const base = normalizeSalarySheet(null, "2026-05");
    const template: SalarySheetData = {
      ...base,
      insuranceHeadcountAuto: undefined,
      insurance: storedInsurance(11, 12),
      materialLines: [{ id: "mat-1", name: "材料", amount: 30 }],
      employees: base.employees.map((row, index) =>
        index === 0 ? { ...row, paySocialMedical: false } : row,
      ),
      otherInsured: [
        {
          id: "o1",
          name: "丙",
          note: "外聘",
          paySocial: true,
          payMedical: false,
        },
      ],
    };

    const next = resolveDefaultSalarySheet("2026-06", template);

    expect(next.employees[0].paySocialMedical).toBe(false);
    expect(next.employees[1].paySocialMedical).toBe(true);
    expect(next.otherInsured).toEqual(template.otherInsured);
    expect(next.materialLines).toEqual([]);
    expect(next.insuranceHeadcountAuto).toBe(true);
    expect(next.insurance.pensionEmployerCount).toBe(9);
    expect(next.insurance.pensionPersonalCount).toBe(9);
    expect(next.insurance.injuryEmployerCount).toBe(9);
    expect(next.insurance.medicalEmployerCount).toBe(8);
    expect(next.insurance.medicalPersonalCount).toBe(8);
    expect(next.insurance.maternityEmployerCount).toBe(8);
    expect(next.housingFund.employerCount).toBe(5);
    expect(next.housingFund.personalCount).toBe(4);
    expect(next.summary.daysInMonth).toBe(30);
  });
});
