import { describe, expect, it } from "vitest";

import {
  computeInsuranceTable,
  computeSalarySheet,
  effectiveInsuranceInput,
  medicalInsuredCount,
  socialInsuredCount,
  syncAutoInsuranceHeadcounts,
} from "./calc";
import { createDefaultSalaryGlobalSettings } from "./settings";
import type {
  SalaryEmployeeInput,
  SalaryHousingFundInput,
  SalaryInsuranceInput,
  SalaryOtherInsured,
  SalarySheetData,
} from "./types";

const settings = createDefaultSalaryGlobalSettings();

function employee(
  partial: Partial<SalaryEmployeeInput> = {},
): SalaryEmployeeInput {
  return {
    id: "employee",
    title: "执业医师",
    name: "测试员工",
    baseSalary: 1000,
    shareRatio: 0.5,
    plantingCount: 2,
    leaveDays: 0,
    housingFund: 100,
    bonusMode: "tiered",
    deductionRate: 0,
    ...partial,
  };
}

function insurance(
  partial: Partial<SalaryInsuranceInput> = {},
): SalaryInsuranceInput {
  return {
    pensionBase: 1000,
    pensionEmployerRate: 0.16,
    pensionEmployerCount: 11,
    pensionPersonalRate: 0.08,
    pensionPersonalCount: 11,
    unemploymentBase: 1000,
    unemploymentEmployerRate: 0.005,
    unemploymentEmployerCount: 11,
    unemploymentPersonalRate: 0.005,
    unemploymentPersonalCount: 11,
    injuryBase: 1000,
    injuryEmployerRate: 0.002,
    injuryEmployerCount: 11,
    medicalBase: 1000,
    medicalEmployerRate: 0.075,
    medicalEmployerCount: 12,
    medicalPersonalRate: 0.02,
    medicalPersonalCount: 12,
    maternityBase: 1000,
    maternityEmployerRate: 0.005,
    maternityEmployerCount: 12,
    ...partial,
  };
}

function housing(
  partial: Partial<SalaryHousingFundInput> = {},
): SalaryHousingFundInput {
  return {
    base: 100,
    employerRate: 0.05,
    employerCount: 5,
    personalRate: 0.07,
    personalCount: 4,
    ...partial,
  };
}

function other(
  partial: Partial<SalaryOtherInsured> & Pick<SalaryOtherInsured, "id">,
): SalaryOtherInsured {
  return {
    name: "",
    note: "",
    paySocial: true,
    payMedical: true,
    ...partial,
  };
}

function sheet(overrides: Partial<SalarySheetData> = {}): SalarySheetData {
  return {
    summary: { totalIncome: 100_000, daysInMonth: 30, workingDays: 25 },
    leaveQuotas: { chen: 0, lu: 0, xu: 0 },
    employees: [employee({ id: "a", name: "甲" })],
    insurance: insurance(),
    housingFund: housing(),
    costItems: {
      utilities: 0,
      rent: 0,
      materials: 0,
      planting: 0,
      processing: 0,
    },
    materialLines: [],
    ...overrides,
  };
}

function compute(data: SalarySheetData) {
  return computeSalarySheet(data, {
    month: "2026-08",
    globalSettings: settings,
  });
}

describe("员工交医社保", () => {
  it("缺省视为缴纳，个人社保医保仍按表内基数和比例计算", () => {
    const row = compute(sheet()).employees[0];
    // 养老 80 + 失业 5；医保 20。人数不参与个人扣款。
    expect(row.paySocialMedical).toBeUndefined();
    expect(row.socialInsurance).toBe(85);
    expect(row.medicalInsurance).toBe(20);
    expect(row.bonus).toBe(5_695);
    expect(row.monthlySalary).toBe(6_695);
  });

  it("关闭后该员工社保和医保为 0，奖金与月薪随之重算，公积金仍扣", () => {
    const enrolled = compute(sheet()).employees[0];
    const optedOut = compute(
      sheet({
        employees: [employee({ id: "a", name: "甲", paySocialMedical: false })],
      }),
    ).employees[0];

    expect(optedOut.socialInsurance).toBe(0);
    expect(optedOut.medicalInsurance).toBe(0);
    expect(optedOut.housingFund).toBe(100);
    expect(optedOut.bonus).toBe(enrolled.bonus + 105);
    expect(optedOut.monthlySalary).toBe(enrolled.monthlySalary + 105);
    expect(optedOut.bonus).toBe(5_800);
    expect(optedOut.monthlySalary).toBe(6_800);
  });

  it("只影响被关闭的员工，其他参保人员不进入工资表", () => {
    const result = compute(
      sheet({
        employees: [
          employee({ id: "a", name: "甲", paySocialMedical: false }),
          employee({ id: "b", name: "乙" }),
        ],
        otherInsured: [
          other({ id: "o1", name: "丙", note: "退休", payMedical: false }),
        ],
      }),
    );

    expect(result.employees.map((row) => row.name)).toEqual(["甲", "乙"]);
    expect(result.employees.map((row) => row.socialInsurance)).toEqual([0, 85]);
    expect(result.employees.map((row) => row.medicalInsurance)).toEqual([
      0, 20,
    ]);
    expect(result.totals.monthlySalary).toBe(6_800 + 6_695);
  });
});

describe("社保医保缴费人数", () => {
  const people = sheet({
    employees: [
      employee({ id: "a", name: "甲", paySocialMedical: false }),
      employee({ id: "b", name: "乙" }),
    ],
    otherInsured: [
      other({ id: "o1", name: "丙", paySocial: true, payMedical: false }),
      other({
        id: "o2",
        name: "",
        note: "未填姓名",
        paySocial: false,
        payMedical: true,
      }),
    ],
    insuranceHeadcountAuto: true,
  });

  it("社保人数含工伤，医保人数含生育，单位与个人人数相同", () => {
    expect(socialInsuredCount(people)).toBe(2);
    expect(medicalInsuredCount(people)).toBe(2);

    const effective = effectiveInsuranceInput(people);
    expect(effective.pensionEmployerCount).toBe(2);
    expect(effective.pensionPersonalCount).toBe(2);
    expect(effective.unemploymentEmployerCount).toBe(2);
    expect(effective.unemploymentPersonalCount).toBe(2);
    expect(effective.injuryEmployerCount).toBe(2);
    expect(effective.medicalEmployerCount).toBe(2);
    expect(effective.medicalPersonalCount).toBe(2);
    expect(effective.maternityEmployerCount).toBe(2);
    expect(people.housingFund).toEqual(housing());
  });

  it("自动人数进入单位成本，公积金人数保持手填", () => {
    const result = compute(people);
    // 单位社保 167 × 2 + 单位医保 80 × 2 + 公积金 100 × 0.05 × 5
    expect(result.insuranceEmployerTotal).toBe(167 * 2 + 80 * 2 + 25);
    const table = computeInsuranceTable(
      effectiveInsuranceInput(people),
      people.housingFund,
    );
    expect(table.lines.find((line) => line.key === "pension")?.rowTotal).toBe(
      160 * 2 + 80 * 2,
    );
    expect(
      table.lines.find((line) => line.key === "housing")?.employerCount,
    ).toBe(5);
    expect(
      table.lines.find((line) => line.key === "housing")?.personalCount,
    ).toBe(4);
  });

  it("未开启自动人数时沿用已保存人数，不因员工开关改单位成本", () => {
    const legacy = sheet({
      employees: [
        employee({ id: "a", name: "甲", paySocialMedical: false }),
        employee({ id: "b", name: "乙" }),
      ],
      otherInsured: [other({ id: "o1", name: "丙" })],
    });
    expect(legacy.insuranceHeadcountAuto).toBeUndefined();
    expect(effectiveInsuranceInput(legacy)).toBe(legacy.insurance);
    expect(syncAutoInsuranceHeadcounts(legacy)).toBe(legacy);

    const result = compute(legacy);
    expect(result.employees[0].socialInsurance).toBe(0);
    expect(result.employees[1].socialInsurance).toBe(85);
    // 11 × 167 + 12 × 80 + 25
    expect(result.insuranceEmployerTotal).toBe(11 * 167 + 12 * 80 + 25);
  });

  it("开启后把人数写回表内，公积金人数不动", () => {
    const synced = syncAutoInsuranceHeadcounts(people);
    expect(synced.insurance.injuryEmployerCount).toBe(2);
    expect(synced.insurance.maternityEmployerCount).toBe(2);
    expect(synced.insurance.pensionPersonalCount).toBe(
      synced.insurance.pensionEmployerCount,
    );
    expect(synced.housingFund.employerCount).toBe(5);
    expect(synced.housingFund.personalCount).toBe(4);
  });
});
