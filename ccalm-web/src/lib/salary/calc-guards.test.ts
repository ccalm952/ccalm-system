import { describe, expect, it } from "vitest";

import { buildPriorBonusMap, installmentAmountForMonth } from "./calc";
import { createDefaultSalaryGlobalSettings } from "./settings";
import type {
  SalaryEmployeeInput,
  SalaryEquipmentInstallment,
  SalarySheetData,
} from "./types";

const settings = createDefaultSalaryGlobalSettings();

function plan(startMonth: string): SalaryEquipmentInstallment {
  return {
    id: "e1",
    name: "设备",
    totalAmount: 1200,
    months: 3,
    startMonth,
  };
}

function employee(name: string): SalaryEmployeeInput {
  return {
    id: name,
    title: "执业医师",
    name,
    baseSalary: 5000,
    shareRatio: 1,
    plantingCount: 0,
    leaveDays: 0,
    housingFund: 0,
    bonusMode: "tiered",
    deductionRate: 0,
  };
}

function sheet(employees: SalaryEmployeeInput[]): SalarySheetData {
  return {
    summary: { totalIncome: 100_000, daysInMonth: 30, workingDays: 25 },
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

describe("installmentAmountForMonth 月份格式校验", () => {
  it("拒绝未补零的月份串（此前会被数字解析出金额）", () => {
    expect(installmentAmountForMonth(plan("2026-1"), "2026-02")).toBe(0);
    expect(installmentAmountForMonth(plan("2026-01"), "2026-2")).toBe(0);
  });

  it("拒绝越界月份", () => {
    expect(installmentAmountForMonth(plan("2026-13"), "2026-14")).toBe(0);
    expect(installmentAmountForMonth(plan("2026-00"), "2026-01")).toBe(0);
  });

  it("拒绝无法解析的月份", () => {
    expect(installmentAmountForMonth(plan("abc-de"), "2026-01")).toBe(0);
    expect(installmentAmountForMonth(plan("2026-01"), "")).toBe(0);
  });

  it("合法月份仍正常计算，末期补差", () => {
    expect(installmentAmountForMonth(plan("2026-01"), "2026-01")).toBe(400);
    expect(installmentAmountForMonth(plan("2026-01"), "2026-03")).toBe(400);
    // 期外
    expect(installmentAmountForMonth(plan("2026-01"), "2026-04")).toBe(0);
    expect(installmentAmountForMonth(plan("2026-01"), "2025-12")).toBe(0);
  });
});

describe("buildPriorBonusMap 依赖链防环", () => {
  const sheets: Record<string, SalarySheetData> = {
    "2026-07": sheet([employee("甲")]),
    "2026-08": sheet([employee("甲")]),
    "2026-09": sheet([employee("甲")]),
  };

  it("自环不再无限递归", () => {
    const selfLoop = () => "2026-09";
    expect(() =>
      buildPriorBonusMap("2026-09", sheets, selfLoop, settings),
    ).not.toThrow();
  });

  it("A→B→A 环不再无限递归", () => {
    const twoCycle = (month: string) =>
      month === "2026-09" ? "2026-08" : "2026-09";
    expect(() =>
      buildPriorBonusMap("2026-09", sheets, twoCycle, settings),
    ).not.toThrow();
  });

  it("无环的逐月回溯仍正常返回", () => {
    const chain = (month: string) => {
      if (month === "2026-09") return "2026-08";
      if (month === "2026-08") return "2026-07";
      return null;
    };
    const result = buildPriorBonusMap("2026-09", sheets, chain, settings);
    expect(Object.keys(result)).toEqual(["甲"]);
  });

  it("上个月无数据时返回空表", () => {
    const none = () => null;
    expect(buildPriorBonusMap("2026-09", sheets, none, settings)).toEqual({});
  });
});
