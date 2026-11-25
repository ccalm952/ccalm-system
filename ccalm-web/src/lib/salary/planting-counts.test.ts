import { describe, expect, it } from "vitest";

import { applyPlantingCountsToSheet } from "./planting-counts";
import type { SalaryEmployeeInput, SalarySheetData } from "./types";

function employee(
  partial: Pick<SalaryEmployeeInput, "id" | "name" | "plantingCount" | "bonusMode">,
): SalaryEmployeeInput {
  return {
    title: "护士",
    baseSalary: 0,
    shareRatio: 0,
    leaveDays: 0,
    housingFund: 0,
    deductionRate: 0,
    paySocialMedical: true,
    ...partial,
  };
}

function sheet(employees: SalaryEmployeeInput[]): SalarySheetData {
  return {
    summary: { totalIncome: 0, daysInMonth: 30, workingDays: 25 },
    leaveQuotas: { chen: 0, lu: 0, xu: 0 },
    employees,
    insurance: {
      pensionBase: 0,
      pensionEmployerRate: 0,
      pensionEmployerCount: 0,
      pensionPersonalRate: 0,
      pensionPersonalCount: 0,
      unemploymentBase: 0,
      unemploymentEmployerRate: 0,
      unemploymentEmployerCount: 0,
      unemploymentPersonalRate: 0,
      unemploymentPersonalCount: 0,
      injuryBase: 0,
      injuryEmployerRate: 0,
      injuryEmployerCount: 0,
      medicalBase: 0,
      medicalEmployerRate: 0,
      medicalEmployerCount: 0,
      medicalPersonalRate: 0,
      medicalPersonalCount: 0,
      maternityBase: 0,
      maternityEmployerRate: 0,
      maternityEmployerCount: 0,
    },
    housingFund: {
      base: 0,
      employerRate: 0,
      employerCount: 0,
      personalRate: 0,
      personalCount: 0,
    },
    costItems: {
      utilities: 0,
      rent: 0,
      materials: 0,
      planting: 0,
      processing: 0,
    },
    materialLines: [],
  };
}

describe("applyPlantingCountsToSheet", () => {
  it("按姓名写入种植次数，统计里没有的人不动", () => {
    const input = sheet([
      employee({
        id: "1",
        name: "卢彤",
        plantingCount: 0,
        bonusMode: "lu_pool",
      }),
      employee({
        id: "2",
        name: "许桦婧",
        plantingCount: 1,
        bonusMode: "xu_pool",
      }),
      employee({
        id: "3",
        name: "吴介尘",
        plantingCount: 5,
        bonusMode: "tiered",
      }),
    ]);

    const next = applyPlantingCountsToSheet(input, {
      卢彤: 8,
      许桦婧: 9,
      陈美珍: 10,
    });

    expect(next.employees.map((e) => [e.name, e.plantingCount])).toEqual([
      ["卢彤", 8],
      ["许桦婧", 9],
      ["吴介尘", 5],
    ]);
  });

  it("次数未变则返回同一对象", () => {
    const input = sheet([
      employee({
        id: "1",
        name: "陈美珍",
        plantingCount: 10,
        bonusMode: "chen_pool",
      }),
    ]);
    expect(applyPlantingCountsToSheet(input, { 陈美珍: 10 })).toBe(input);
  });
});
