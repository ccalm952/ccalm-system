import { describe, expect, it } from "vitest"

import { buildPriorBonusMap, computeSalarySheet } from "./calc"
import { createDefaultSalaryGlobalSettings } from "./settings"
import type { SalaryEmployeeInput, SalarySheetData } from "./types"

const settings = createDefaultSalaryGlobalSettings()

function employee(
  partial: Partial<SalaryEmployeeInput> = {}
): SalaryEmployeeInput {
  return {
    id: "employee",
    title: "执业医师",
    name: "测试员工",
    baseSalary: 1000,
    shareRatio: 1,
    plantingCount: 0,
    leaveDays: 0,
    housingFund: 0,
    bonusMode: "tiered",
    ...partial,
  }
}

function sheet(
  totalIncome: number,
  employees: SalaryEmployeeInput[]
): SalarySheetData {
  return {
    summary: { totalIncome, daysInMonth: 30, workingDays: 25 },
    leaveQuotas: { chen: 30, lu: 30, xu: 30 },
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
      other: 0,
    },
  }
}

function computedEmployee(
  totalIncome: number,
  input = employee(),
  globalSettings = settings
) {
  return computeSalarySheet(sheet(totalIncome, [input]), {
    globalSettings,
  }).employees[0]
}

describe("薪资计算", () => {
  it.each([
    [20_000, 2_000],
    [20_001, 2_000.12],
    [100_000, 14_000],
    [100_001, 14_000.2],
  ])("在实收 %i 的档位边界计算奖金", (actualReceipt, bonus) => {
    expect(
      computedEmployee(actualReceipt, employee(), {
        ...settings,
        doctorReceiptDeductionRate: 0,
      }).bonus
    ).toBe(bonus)
  })

  it("先按分成比例计算实收，再扣减设置比例", () => {
    const row = computedEmployee(100_000, employee({ shareRatio: 0.5 }))
    expect(row.actualReceipt).toBe(40_000)
    expect(row.bonus).toBe(4_400)
  })

  it("护士个人池按总收入×(1−护士扣减%)计算，请假与池比例不变", () => {
    const result = computeSalarySheet(
      sheet(100_000, [
        employee({
          id: "chen",
          name: "陈美珍",
          title: "护士",
          bonusMode: "chen_pool",
          shareRatio: 0,
        }),
      ]),
      {
        globalSettings: {
          ...settings,
          nurseDeductionRate: 0.25,
        },
      },
    )
    // 净收入 75000，请假 30 天 → 个人池 0 → 奖金 0
    expect(result.employees[0].bonus).toBe(0)

    const withWork = computeSalarySheet(
      {
        ...sheet(100_000, [
          employee({
            id: "chen",
            name: "陈美珍",
            title: "护士",
            bonusMode: "chen_pool",
            shareRatio: 0,
          }),
        ]),
        leaveQuotas: { chen: 0, lu: 30, xu: 30 },
      },
      {
        globalSettings: {
          ...settings,
          nurseDeductionRate: 0.25,
        },
      },
    )
    // 个人池 = 75000，奖金 = 75000 × 0.003 = 225
    expect(withWork.employees[0].bonus).toBe(225)
  })

  it("区分吴介尘与其他员工的种植单价", () => {
    const result = computeSalarySheet(
      sheet(0, [
        employee({ id: "wu", name: "吴介尘", plantingCount: 2 }),
        employee({ id: "other", name: "其他员工", plantingCount: 2 }),
      ]),
      { globalSettings: settings }
    )

    expect(result.employees.map((row) => row.plantingBonus)).toEqual([
      1_000, 100,
    ])
  })

  it("通过公开 API 结转上月负奖金到本月扣后底薪", () => {
    const january = sheet(0, [employee({ housingFund: 100 })])
    const february = sheet(0, [employee()])
    const sheets = { "2026-01": january, "2026-02": february }
    const priorBonusByName = buildPriorBonusMap(
      "2026-02",
      sheets,
      (month) => (month === "2026-02" ? "2026-01" : null),
      settings
    )

    expect(priorBonusByName).toEqual({ 测试员工: -100 })
    const result = computeSalarySheet(february, {
      globalSettings: settings,
      priorBonusByName,
    })
    expect(result.employees[0].deductedBase).toBe(900)
  })
})
