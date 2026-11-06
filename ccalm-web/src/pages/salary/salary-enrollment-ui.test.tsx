import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { computeSalarySheet } from "@/lib/salary/calc";
import { createDefaultSalaryGlobalSettings } from "@/lib/salary/settings";
import type { SalaryEmployeeInput, SalarySheetData } from "@/lib/salary/types";

import { InsuranceFundTable } from "./InsuranceFundTable";
import { OtherInsuredTable } from "./OtherInsuredTable";
import { SalaryEmployeeTable } from "./SalaryEmployeeTable";

const settings = createDefaultSalaryGlobalSettings();

function employee(
  partial: Partial<SalaryEmployeeInput> = {},
): SalaryEmployeeInput {
  return {
    id: "a",
    title: "执业医师",
    name: "甲",
    baseSalary: 1000,
    shareRatio: 0,
    plantingCount: 0,
    leaveDays: 0,
    housingFund: 0,
    bonusMode: "tiered",
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
    otherInsured: [
      {
        id: "o1",
        name: "丙",
        note: "退休",
        paySocial: true,
        payMedical: false,
      },
    ],
    insuranceHeadcountAuto: true,
    insurance: {
      pensionBase: 1000,
      pensionEmployerRate: 0.16,
      pensionEmployerCount: 0,
      pensionPersonalRate: 0.08,
      pensionPersonalCount: 0,
      unemploymentBase: 0,
      unemploymentEmployerRate: 0,
      unemploymentEmployerCount: 0,
      unemploymentPersonalRate: 0,
      unemploymentPersonalCount: 0,
      injuryBase: 0,
      injuryEmployerRate: 0,
      injuryEmployerCount: 0,
      medicalBase: 1000,
      medicalEmployerRate: 0.075,
      medicalEmployerCount: 0,
      medicalPersonalRate: 0.02,
      medicalPersonalCount: 0,
      maternityBase: 0,
      maternityEmployerRate: 0,
      maternityEmployerCount: 0,
    },
    housingFund: {
      base: 100,
      employerRate: 0.05,
      employerCount: 5,
      personalRate: 0.07,
      personalCount: 4,
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

describe("薪资页参保控件", () => {
  it("员工表展示交医社保，关闭后社保医保为 0", () => {
    const data = sheet([
      employee({ paySocialMedical: false }),
      employee({ id: "b", name: "乙", paySocialMedical: true }),
    ]);
    const computed = computeSalarySheet(data, {
      month: "2026-08",
      globalSettings: settings,
    });
    const html = renderToStaticMarkup(
      <SalaryEmployeeTable
        computed={computed}
        updateEmployee={() => undefined}
        removeEmployee={() => undefined}
        onAddEmployee={() => undefined}
        onReorderEmployees={() => undefined}
      />,
    );

    expect(html).toContain("交医社保");
    expect(html).toContain("甲");
    expect(html).toContain("乙");
    expect(computed.employees[0].socialInsurance).toBe(0);
    expect(computed.employees[0].medicalInsurance).toBe(0);
    expect(computed.employees[1].socialInsurance).toBe(80);
    expect(computed.employees[1].medicalInsurance).toBe(20);
    expect(html).toContain(">0<");
    expect(html).toContain(">80<");
    expect(html).toContain(">20<");
  });

  it("五险一金人数只读，其他参保人员可单独勾选社保和医保", () => {
    const data = sheet([employee()]);
    const html = renderToStaticMarkup(
      <>
        <InsuranceFundTable
          insurance={{
            ...data.insurance,
            pensionEmployerCount: 2,
            pensionPersonalCount: 2,
            unemploymentEmployerCount: 2,
            unemploymentPersonalCount: 2,
            injuryEmployerCount: 2,
            medicalEmployerCount: 1,
            medicalPersonalCount: 1,
            maternityEmployerCount: 1,
          }}
          housingFund={data.housingFund}
          onInsuranceChange={() => undefined}
          onHousingChange={() => undefined}
        />
        <OtherInsuredTable
          rows={data.otherInsured ?? []}
          onChange={() => undefined}
        />
      </>,
    );

    expect(html).toContain("其他参保人员");
    expect(html).toContain("交社保");
    expect(html).toContain("交医保");
    expect(html).toContain("丙");
    expect(html).toContain("退休");
    expect(html).toContain(">2<");
    expect(html).toContain(">1<");
    expect(html).toContain('value="5"');
    expect(html).toContain('value="4"');
  });
});
