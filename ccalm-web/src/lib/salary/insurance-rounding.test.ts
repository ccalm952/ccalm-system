import { describe, expect, it } from "vitest"

import { computeInsuranceTable, computeSalarySheet, round2 } from "./calc"
import { createDefaultSalaryGlobalSettings } from "./settings"
import type {
  SalaryHousingFundInput,
  SalaryInsuranceInput,
  SalarySheetData,
} from "./types"

const settings = createDefaultSalaryGlobalSettings()

function emptyInsurance(): SalaryInsuranceInput {
  return {
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
  }
}

function emptyHousing(): SalaryHousingFundInput {
  return {
    base: 0,
    employerRate: 0,
    employerCount: 0,
    personalRate: 0,
    personalCount: 0,
  }
}

function makeSheet(
  insurance: SalaryInsuranceInput,
  housingFund: SalaryHousingFundInput
): SalarySheetData {
  return {
    summary: { totalIncome: 0, daysInMonth: 30, workingDays: 25 },
    leaveQuotas: { chen: 0, lu: 0, xu: 0 },
    employees: [],
    insurance,
    housingFund,
    costItems: {
      utilities: 0,
      rent: 0,
      materials: 0,
      planting: 0,
      processing: 0,
    },
    materialLines: [],
  }
}

function sheetEmployerTotal(
  insurance: SalaryInsuranceInput,
  housingFund: SalaryHousingFundInput
): number {
  return computeSalarySheet(makeSheet(insurance, housingFund), {
    month: "2026-08",
    globalSettings: settings,
  }).insuranceEmployerTotal
}

describe("五险一金取整口径统一", () => {
  it("社保各行与汇总都用 round2(base×rate×count)，只舍入一次", () => {
    // 3333 × 0.005 × 5 的精确值是 83.325。
    // 更早的口径先舍单人（round2(16.665) = 16.67）再乘 5 得 83.35；
    // 统一为只舍入一次后，round2 内部会先吸附上游乘法噪声，得到精确的 83.33。
    const insurance = {
      ...emptyInsurance(),
      pensionBase: 3333,
      pensionEmployerRate: 0.005,
      pensionEmployerCount: 5,
    }

    const table = computeInsuranceTable(insurance, emptyHousing())
    const pension = table.lines.find((line) => line.key === "pension")

    expect(pension?.rowTotal).toBe(83.33)
    expect(table.groupTotals.social).toBe(83.33)
  })

  it("公积金行与汇总口径一致（此前会差 0.03）", () => {
    const housing = {
      ...emptyHousing(),
      base: 3333,
      employerRate: 0.005,
      employerCount: 5,
    }

    const table = computeInsuranceTable(emptyInsurance(), housing)

    expect(table.groupTotals.housing).toBe(83.33)
    expect(sheetEmployerTotal(emptyInsurance(), housing)).toBe(83.33)
  })

  it("表格合计与薪资表汇总在多种数值下都相等", () => {
    const cases: {
      base: number
      rate: number
      count: number
    }[] = [
      { base: 3333, rate: 0.005, count: 5 },
      { base: 7337, rate: 0.005, count: 3 },
      { base: 8000, rate: 0.08, count: 12 },
      { base: 10000, rate: 0.16, count: 3 },
      { base: 1200, rate: 5 / 12, count: 5 },
    ]

    for (const { base, rate, count } of cases) {
      const housing = {
        ...emptyHousing(),
        base,
        employerRate: rate,
        employerCount: count,
      }

      const table = computeInsuranceTable(emptyInsurance(), housing)

      expect(table.groupTotals.housing).toBe(
        sheetEmployerTotal(emptyInsurance(), housing)
      )
    }
  })

  it("精确可表示的值不受影响", () => {
    const housing = {
      ...emptyHousing(),
      base: 7337,
      employerRate: 0.005,
      employerCount: 3,
    }

    expect(
      computeInsuranceTable(emptyInsurance(), housing).groupTotals.housing
    ).toBe(110.06)
  })

  it("上游连乘的浮点噪声会被 round2 吸附", () => {
    // 连乘自身就会丢精度（精确值是 83.325，改变结合顺序只能把误差挪到别处）
    expect(3333 * 0.005 * 5).not.toBe(83.325)
    expect(7337 * 0.005 * 3).toBe(110.055)

    // 吸附后仍能得到精确结果
    expect(round2(3333 * 0.005 * 5)).toBe(83.33)
    expect(round2(7337 * 0.005 * 3)).toBe(110.06)
    // 右结合会算错的那个组合，吸附后同样正确
    expect(round2(7337 * (0.005 * 3))).toBe(110.06)
  })
})
