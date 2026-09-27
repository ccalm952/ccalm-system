import { describe, expect, it } from "vitest"

import {
  buildPriorBonusMap,
  calcEquipmentCostForMonth,
  calcOtherCostFromItems,
  computeInsuranceTable,
  computeSalarySheet,
  installmentAmountForMonth,
  round2,
} from "./calc"
import { createDefaultSalaryGlobalSettings } from "./settings"
import type {
  SalaryComputeContext,
  SalaryEmployeeInput,
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

/** 单位与个人人数均为 3 的样例，各项金额都是整数，便于断言 */
function sampleInsurance(): SalaryInsuranceInput {
  return {
    pensionBase: 10000,
    pensionEmployerRate: 0.16,
    pensionEmployerCount: 3,
    pensionPersonalRate: 0.08,
    pensionPersonalCount: 3,
    unemploymentBase: 10000,
    unemploymentEmployerRate: 0.005,
    unemploymentEmployerCount: 3,
    unemploymentPersonalRate: 0.005,
    unemploymentPersonalCount: 3,
    injuryBase: 10000,
    injuryEmployerRate: 0.002,
    injuryEmployerCount: 3,
    medicalBase: 8000,
    medicalEmployerRate: 0.08,
    medicalEmployerCount: 3,
    medicalPersonalRate: 0.02,
    medicalPersonalCount: 3,
    maternityBase: 8000,
    maternityEmployerRate: 0.01,
    maternityEmployerCount: 3,
  }
}

function sampleHousing(): SalaryHousingFundInput {
  return {
    base: 6000,
    employerRate: 0.05,
    employerCount: 3,
    personalRate: 0.05,
    personalCount: 3,
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

function employee(
  partial: Partial<SalaryEmployeeInput> = {}
): SalaryEmployeeInput {
  return {
    id: "employee",
    title: "执业医师",
    name: "测试员工",
    baseSalary: 5000,
    shareRatio: 1,
    plantingCount: 0,
    leaveDays: 0,
    housingFund: 0,
    bonusMode: "tiered",
    deductionRate: 0,
    ...partial,
  }
}

function makeSheet(
  employees: SalaryEmployeeInput[],
  overrides: Partial<SalarySheetData> = {}
): SalarySheetData {
  return {
    summary: { totalIncome: 100_000, daysInMonth: 30, workingDays: 25 },
    leaveQuotas: { chen: 0, lu: 0, xu: 0 },
    employees,
    insurance: emptyInsurance(),
    housingFund: emptyHousing(),
    costItems: {
      utilities: 0,
      rent: 0,
      materials: 0,
      planting: 0,
      processing: 0,
      other: 0,
    },
    materialLines: [],
    ...overrides,
  }
}

function compute(
  employees: SalaryEmployeeInput[],
  overrides: Partial<SalarySheetData> = {},
  context: Partial<SalaryComputeContext> = {}
) {
  return computeSalarySheet(makeSheet(employees, overrides), {
    month: "2026-08",
    globalSettings: settings,
    ...context,
  })
}

describe("round2 两位小数舍入", () => {
  it("修正浮点误差后保留两位小数", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(-0.1 - 0.2)).toBe(-0.3)
    expect(round2(1.0049999)).toBe(1)
    expect(round2(-1.0049999)).toBe(-1)
  })

  it("半分进位（正数向上）", () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(2.675)).toBe(2.68)
    expect(round2(10.235)).toBe(10.24)
    expect(round2(100.005)).toBe(100.01)
  })

  it("整数与零原样返回", () => {
    expect(round2(0)).toBe(0)
    expect(round2(1234)).toBe(1234)
    expect(round2(-100)).toBe(-100)
  })

  it("负数半分向正无穷取整，与正数不对称", () => {
    // Math.round 对 .5 一律向 +∞，故负数半分偏「大」
    expect(round2(-1.005)).toBe(-1)
    expect(round2(-2.675)).toBe(-2.67)
    expect(round2(-10.235)).toBe(-10.23)
  })

  it("不足半分归零，负数为负零", () => {
    expect(round2(0.004)).toBe(0)
    expect(round2(1e-9)).toBe(0)
    expect(Object.is(round2(-0.004), -0)).toBe(true)
    expect(Object.is(round2(-1e-9), -0)).toBe(true)
  })

  it("EPSILON 补偿在百万级失效（已知精度局限）", () => {
    expect(round2(1_234_567.005)).toBe(1_234_567)
    expect(round2(9_999_999.995)).toBe(9_999_999.99)
  })
})

describe("computeInsuranceTable 五险一金表", () => {
  const table = computeInsuranceTable(sampleInsurance(), sampleHousing())

  const rows = table.lines.map((line) => ({
    key: line.key,
    group: line.group,
    employerPayment: line.employerPayment,
    personalPayment: line.personalPayment,
    rowTotal: line.rowTotal,
  }))

  it("按社保 / 医保 / 公积金三组生成六行", () => {
    expect(rows).toEqual([
      {
        key: "pension",
        group: "social",
        employerPayment: 1600,
        personalPayment: 800,
        rowTotal: 7200,
      },
      {
        key: "unemployment",
        group: "social",
        employerPayment: 50,
        personalPayment: 50,
        rowTotal: 300,
      },
      {
        key: "injury",
        group: "social",
        employerPayment: 20,
        personalPayment: null,
        rowTotal: 60,
      },
      {
        key: "medical",
        group: "medical",
        employerPayment: 640,
        personalPayment: 160,
        rowTotal: 2400,
      },
      {
        key: "maternity",
        group: "medical",
        employerPayment: 80,
        personalPayment: null,
        rowTotal: 240,
      },
      {
        key: "housing",
        group: "housing",
        employerPayment: 300,
        personalPayment: 300,
        rowTotal: 1800,
      },
    ])
    expect(table.lines.map((line) => line.groupLabel)).toEqual([
      "社保",
      "社保",
      "社保",
      "医保",
      "医保",
      "公积金",
    ])
    // 工伤 / 生育没有个人缴费与个人人数
    expect(table.lines[2].personalRate).toBeNull()
    expect(table.lines[2].personalCount).toBeNull()
    expect(table.lines[4].personalRate).toBeNull()
    expect(table.lines[4].personalCount).toBeNull()
  })

  it("分组总计按人数加权，小计为单人金额", () => {
    expect(table.groupTotals).toEqual({
      social: 7560,
      medical: 2640,
      housing: 1800,
    })
    expect(table.groupSubtotals).toEqual({
      social: { employer: 1670, personal: 850 },
      medical: { employer: 720, personal: 160 },
      housing: { employer: 300, personal: 300 },
    })

    for (const group of ["social", "medical", "housing"] as const) {
      const groupLines = table.lines.filter((line) => line.group === group)
      const weighted = groupLines.reduce(
        (sum, line) =>
          sum +
          line.employerPayment * line.employerCount +
          (line.personalPayment ?? 0) * (line.personalCount ?? 0),
        0
      )
      expect(round2(weighted)).toBe(table.groupTotals[group])
      // 样例中单位与个人人数都是 3
      const { employer, personal } = table.groupSubtotals[group]
      expect(round2(employer * 3 + (personal ?? 0) * 3)).toBe(
        table.groupTotals[group]
      )
    }
  })

  it("全部为 0 时各组小计与总计均为 0", () => {
    const empty = computeInsuranceTable(emptyInsurance(), emptyHousing())
    expect(empty.lines.every((line) => line.rowTotal === 0)).toBe(true)
    expect(empty.lines.every((line) => line.employerPayment === 0)).toBe(true)
    expect(empty.groupTotals).toEqual({ social: 0, medical: 0, housing: 0 })
    expect(empty.groupSubtotals).toEqual({
      social: { employer: 0, personal: 0 },
      medical: { employer: 0, personal: 0 },
      housing: { employer: 0, personal: 0 },
    })
  })

  it("缴费人数为 0 时总计为 0，小计仍保留单人金额", () => {
    const insurance = {
      ...emptyInsurance(),
      pensionBase: 10000,
      pensionEmployerRate: 0.16,
      pensionPersonalRate: 0.08,
    }
    const table = computeInsuranceTable(insurance, emptyHousing())
    expect(table.lines[0].employerPayment).toBe(1600)
    expect(table.lines[0].personalPayment).toBe(800)
    expect(table.lines[0].rowTotal).toBe(0)
    expect(table.groupTotals.social).toBe(0)
    expect(table.groupSubtotals.social).toEqual({
      employer: 1600,
      personal: 800,
    })
  })

  it("单位有人数而个人人数为 0 时，个人缴费不进总计", () => {
    const insurance = {
      ...emptyInsurance(),
      pensionBase: 10000,
      pensionEmployerRate: 0.16,
      pensionEmployerCount: 2,
      pensionPersonalRate: 0.08,
    }
    const table = computeInsuranceTable(insurance, emptyHousing())
    expect(table.lines[0].personalPayment).toBe(800)
    expect(table.lines[0].rowTotal).toBe(3200)
    expect(table.groupTotals.social).toBe(3200)
    expect(table.groupSubtotals.social.personal).toBe(800)
  })
})

describe("computeSalarySheet 核心计算", () => {
  it("五险一金同时扣减个人与计入单位成本", () => {
    const result = compute([employee()], {
      insurance: sampleInsurance(),
      housingFund: sampleHousing(),
    })
    const row = result.employees[0]

    // 个人五险 = 养老 800 + 失业 50；个人医保 = 160
    expect(row.socialInsurance).toBe(850)
    expect(row.medicalInsurance).toBe(160)
    expect(row.leaveOffset).toBe(0)
    expect(row.deductedBase).toBe(5000)
    expect(row.actualReceipt).toBe(100_000)
    expect(row.plantingBonus).toBe(0)
    // 阶梯提成 14000 − 个人五险 1010
    expect(row.bonus).toBe(12_990)
    expect(row.monthlySalary).toBe(17_990)

    expect(result.totals).toEqual({
      deductedBase: 5000,
      shareRatio: 1,
      bonus: 12_990,
      monthlySalary: 17_990,
    })
    expect(result.employeePayrollTotal).toBe(17_990)
    // 单位五险 7170 + 单位公积金 900
    expect(result.insuranceEmployerTotal).toBe(8070)
    expect(result.netIncome).toBe(100_000)
    expect(result.costGrandTotal).toBe(26_060)
    expect(result.remaining).toBe(73_940)
    expect(result.profitRate).toBeCloseTo(0.7394, 10)

    // 与五险一金表的小计保持一致
    const table = computeInsuranceTable(sampleInsurance(), sampleHousing())
    expect(row.socialInsurance).toBe(table.groupSubtotals.social.personal)
    expect(row.medicalInsurance).toBe(table.groupSubtotals.medical.personal)
    expect(result.insuranceEmployerTotal).toBe(
      (table.groupSubtotals.social.employer +
        table.groupSubtotals.medical.employer) *
        3 +
        table.groupSubtotals.housing.employer * 3
    )
  })

  it.each([
    [20_000, 2_000],
    [60_000, 7_200],
    [100_000, 14_000],
    [150_000, 24_000],
  ])("医生实收 %i 时阶梯奖金为 %i", (totalIncome, bonus) => {
    const result = compute([employee()], {
      summary: { totalIncome, daysInMonth: 30, workingDays: 25 },
    })
    expect(result.employees[0].bonus).toBe(bonus)
  })

  it("非执业医师使用助理档位费率", () => {
    const result = compute([employee({ title: "护士" })])
    expect(result.employees[0].bonus).toBe(9_000)
  })

  it("先按分成比例与扣减比例算实收，再算阶梯奖金", () => {
    const result = compute([employee({ shareRatio: 0.5, deductionRate: 0.2 })])
    const row = result.employees[0]
    expect(row.actualReceipt).toBe(40_000)
    expect(row.bonus).toBe(4_400)
  })

  it("实收为 0 时奖金为负，总计不累计负奖金但底薪照扣", () => {
    const result = compute([employee({ housingFund: 100 })], {
      summary: { totalIncome: 0, daysInMonth: 30, workingDays: 25 },
    })
    const row = result.employees[0]
    expect(row.actualReceipt).toBe(0)
    expect(row.bonus).toBe(-100)
    expect(row.monthlySalary).toBe(4_900)
    expect(result.totals.bonus).toBe(0)
    expect(result.totals.monthlySalary).toBe(4_900)
    expect(result.employeePayrollTotal).toBe(4_900)
  })

  it("请假按计薪工作日折算并保留两位小数", () => {
    const result = compute([employee({ baseSalary: 1000, leaveDays: 1 })], {
      summary: { totalIncome: 0, daysInMonth: 30, workingDays: 3 },
    })
    const row = result.employees[0]
    expect(row.leaveOffset).toBe(333.33)
    expect(row.deductedBase).toBe(666.67)
  })

  it("计薪工作日为 0 时不扣请假底薪", () => {
    const result = compute([employee({ baseSalary: 1000, leaveDays: 5 })], {
      summary: { totalIncome: 0, daysInMonth: 30, workingDays: 0 },
    })
    expect(result.employees[0].leaveOffset).toBe(0)
    expect(result.employees[0].deductedBase).toBe(1000)
  })

  it("护士个人池按出勤天数折算并乘池比例", () => {
    const result = compute(
      [
        employee({
          bonusMode: "chen_pool",
          shareRatio: 0,
          deductionRate: 0.25,
        }),
      ],
      { leaveQuotas: { chen: 10, lu: 0, xu: 0 } }
    )
    const row = result.employees[0]
    // 池收入 75000 → 日均 2500 → 出勤 20 天 = 50000，×0.3% = 150
    expect(row.actualReceipt).toBe(0)
    expect(row.bonus).toBe(150)
    expect(row.monthlySalary).toBe(5_150)
  })

  it("当月天数为 0 时池奖金为 0，不产生除零", () => {
    const result = compute([employee({ bonusMode: "lu_pool" })], {
      summary: { totalIncome: 100_000, daysInMonth: 0, workingDays: 25 },
    })
    expect(result.employees[0].bonus).toBe(0)
  })

  it("扣减比例缺省或非法时按模式回退默认值", () => {
    const tiered = compute([employee({ deductionRate: NaN })])
    // 阶梯默认医生扣减 20%
    expect(tiered.employees[0].actualReceipt).toBe(80_000)

    const pool = compute([
      employee({ bonusMode: "xu_pool", deductionRate: undefined }),
    ])
    // 池行默认护士扣减 20%：80000 × 0.2% = 160
    expect(pool.employees[0].bonus).toBe(160)
  })

  it("上月负奖金结转扣后底薪，正奖金不结转", () => {
    const negative = compute(
      [employee()],
      {},
      {
        priorBonusByName: { 测试员工: -300 },
      }
    )
    expect(negative.employees[0].deductedBase).toBe(4_700)

    const positive = compute(
      [employee()],
      {},
      {
        priorBonusByName: { 测试员工: 500 },
      }
    )
    expect(positive.employees[0].deductedBase).toBe(5_000)
  })

  it("缺省 priorBonusByName 时按 0 处理", () => {
    const result = compute([employee()], {}, { priorBonusByName: undefined })
    expect(result.employees[0].deductedBase).toBe(5_000)
  })

  it("空员工数组时各项汇总为 0", () => {
    const result = compute([])
    expect(result.employees).toEqual([])
    expect(result.totals).toEqual({
      deductedBase: 0,
      shareRatio: 0,
      bonus: 0,
      monthlySalary: 0,
    })
    expect(result.employeePayrollTotal).toBe(0)
    expect(result.equipmentCost).toBe(0)
    expect(result.otherCost).toBe(0)
    expect(result.netIncome).toBe(100_000)
    expect(result.costGrandTotal).toBe(0)
    expect(result.remaining).toBe(100_000)
    expect(result.profitRate).toBe(1)
  })

  it("总收入为 0 时利润率为 0 而不是 NaN", () => {
    const result = compute([], {
      summary: { totalIncome: 0, daysInMonth: 30, workingDays: 25 },
    })
    expect(result.remaining).toBe(0)
    expect(result.profitRate).toBe(0)
  })

  it("实收收入只扣材料/种植/其他/加工，水电租金只进成本总计", () => {
    const result = compute([], {
      costItems: {
        utilities: 1000,
        rent: 2000,
        materials: 3000,
        planting: 400,
        processing: 600,
        other: 9999,
      },
    })
    // costItems.other 不参与计算，其他成本只来自全局设置
    expect(result.otherCost).toBe(0)
    expect(result.netIncome).toBe(96_000)
    expect(result.costGrandTotal).toBe(7000)
    expect(result.remaining).toBe(93_000)
    expect(result.profitRate).toBeCloseTo(0.93, 10)
  })

  it("全局其他成本与设备分期计入成本总计", () => {
    const globalSettings = {
      ...settings,
      otherCostItems: [{ id: "o1", name: "广告", amount: 2000 }],
      equipmentInstallments: [
        {
          id: "e1",
          name: "设备",
          totalAmount: 100,
          months: 3,
          startMonth: "2026-08",
        },
      ],
    }
    const result = compute([], {}, { globalSettings })
    expect(result.otherCost).toBe(2000)
    expect(result.equipmentCost).toBe(33.33)
    expect(result.costGrandTotal).toBe(2033.33)
  })
})

describe("设备分期与其他成本加总", () => {
  const plan = {
    id: "e1",
    name: "设备",
    totalAmount: 100,
    months: 3,
    startMonth: "2026-11",
  }

  it("分期内按月摊分，末期补足尾差", () => {
    expect(installmentAmountForMonth(plan, "2026-11")).toBe(33.33)
    expect(installmentAmountForMonth(plan, "2026-12")).toBe(33.33)
    // 跨年：末期用总额减已摊部分
    expect(installmentAmountForMonth(plan, "2027-01")).toBe(33.34)
  })

  it("期外、非法月份与异常金额返回 0", () => {
    expect(installmentAmountForMonth(plan, "2026-10")).toBe(0)
    expect(installmentAmountForMonth(plan, "2027-02")).toBe(0)
    expect(installmentAmountForMonth(plan, "非法")).toBe(0)
    expect(installmentAmountForMonth({ ...plan, months: 0 }, "2026-11")).toBe(0)
    expect(
      installmentAmountForMonth({ ...plan, totalAmount: 0 }, "2026-11")
    ).toBe(0)
  })

  it("非补零月份串仍会被解析（依赖上层校验）", () => {
    const loose = { ...plan, startMonth: "2026-1" }
    expect(installmentAmountForMonth(loose, "2026-01")).toBe(33.33)
    expect(installmentAmountForMonth(loose, "2026-13")).toBe(0)
  })

  it("多笔分期当月加总，空数组为 0", () => {
    expect(
      calcEquipmentCostForMonth(
        [plan, { ...plan, id: "e2", totalAmount: 200, months: 2 }],
        "2026-11"
      )
    ).toBe(133.33)
    expect(calcEquipmentCostForMonth([], "2026-11")).toBe(0)
  })

  it("其他成本项目加总并保留两位小数", () => {
    expect(calcOtherCostFromItems([])).toBe(0)
    expect(
      calcOtherCostFromItems([
        { id: "1", name: "广告", amount: 0.1 },
        { id: "2", name: "维修", amount: 0.2 },
      ])
    ).toBe(0.3)
  })
})

describe("buildPriorBonusMap 上月奖金映射", () => {
  const january = makeSheet([employee({ housingFund: 100 })], {
    summary: { totalIncome: 0, daysInMonth: 30, workingDays: 25 },
  })

  it("无上月或上月无数据时返回空映射", () => {
    const sheets = { "2026-01": january }
    // 没有上月
    expect(buildPriorBonusMap("2026-01", sheets, () => null, settings)).toEqual(
      {}
    )
    // 上月不在已保存的数据里
    expect(
      buildPriorBonusMap(
        "2026-03",
        sheets,
        (month) => (month === "2026-03" ? "2026-02" : null),
        settings
      )
    ).toEqual({})
  })

  it("负奖金写入映射并可用于结转", () => {
    const sheets = { "2026-01": january }
    const map = buildPriorBonusMap(
      "2026-02",
      sheets,
      (month) => (month === "2026-02" ? "2026-01" : null),
      settings
    )
    expect(map).toEqual({ 测试员工: -100 })
  })

  it("上月正奖金也写入映射，但结转时归零", () => {
    const sheets = { "2026-01": makeSheet([employee()]) }
    const map = buildPriorBonusMap(
      "2026-02",
      sheets,
      (month) => (month === "2026-02" ? "2026-01" : null),
      settings
    )
    expect(map).toEqual({ 测试员工: 14_000 })

    const result = computeSalarySheet(sheets["2026-01"], {
      month: "2026-01",
      globalSettings: settings,
      priorBonusByName: map,
    })
    expect(result.employees[0].deductedBase).toBe(5_000)
  })

  it("逐月递归结转，缺失的上月会中断递归", () => {
    const sheets = {
      "2026-01": january,
      "2026-02": makeSheet([employee()], {
        summary: { totalIncome: 0, daysInMonth: 30, workingDays: 25 },
      }),
    }
    const previous: Record<string, string | null> = {
      "2026-03": "2026-02",
      "2026-02": "2026-01",
      "2026-01": null,
    }
    const getPrevious = (month: string) => previous[month] ?? null

    // 1 月奖金 -100 结转到 2 月，2 月自身奖金为 0
    expect(
      buildPriorBonusMap("2026-02", sheets, getPrevious, settings)
    ).toEqual({ 测试员工: -100 })
    expect(
      buildPriorBonusMap("2026-03", sheets, getPrevious, settings)
    ).toEqual({ 测试员工: 0 })
  })
})
