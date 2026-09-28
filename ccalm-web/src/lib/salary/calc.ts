import type {
  SalaryComputeContext,
  SalaryEmployeeComputed,
  SalaryEmployeeInput,
  SalaryEquipmentInstallment,
  SalaryGlobalSettings,
  SalaryHousingFundInput,
  SalaryInsuranceInput,
  SalaryLeaveQuotas,
  SalaryOtherCostItem,
  SalarySheetComputed,
  SalarySheetData,
  SalaryTierRates,
  SalaryTierThresholds,
} from "./types"
import {
  defaultDeductionRateForMode,
  plantingBonusPerUnitForEmployee,
  poolBonusRateForMode,
  tierRatesForTitle,
} from "./settings"

/**
 * 保留两位小数。
 *
 * 目标语义是「按十进制书写意图四舍五入」（1.005 → 1.01）。注意 1.005 在二进制
 * 浮点里实际是 1.00499999999999989…，直接舍入会得到 1.00，所以必须补偿。
 *
 * 三点关键：
 * - 补偿不能用固定绝对值。原先加 `Number.EPSILON`（2.22e-16），对 1.005 有效，
 *   但对 1234567.005 这种量级小了 16 个数量级，会静默舍错。
 *   这里改用指数记数法按十进制字符串缩放，从根上绕开 `n * 100` 的浮点误差。
 * - 负数的 .5 一律「远离零」（-1.005 → -1.01），与正数对称。`Math.round` 本身
 *   朝 +∞ 取整，直接使用会让负数在 .5 处截断。
 * - 结果为 0 时不返回 -0，避免界面把「0.00」渲染成「-0.00」。
 * - 入库前先按 10 位小数吸附，消除**上游乘法**累积的浮点噪声：连续相乘会让
 *   3333 × 0.005 × 5 变成 83.32499999999999（精确值是 83.325），不吸附就会
 *   舍成 83.32。实测改变乘法结合顺序只能把误差挪到别的数值上，无法根治；
 *   在舍入前吸附才是通用解法（且不影响下方已有的舍入语义）。
 */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return n
  // 超过 double 能表示「分」的范围时，两位小数已无意义
  if (Math.abs(n) >= Number.MAX_SAFE_INTEGER / 100) return n
  const snapped = Number(n.toFixed(10))
  const sign = snapped < 0 ? -1 : 1
  const abs = Math.abs(snapped)
  const shifted = Number(`${abs}e2`)
  // 走到这里只剩 |n| < 1e-6 的情况（String() 会转科学计数法），必然舍入为 0
  if (!Number.isFinite(shifted)) return 0
  const magnitude = Number(`${Math.round(shifted)}e-2`)
  const result = sign * magnitude
  return result === 0 ? 0 : result
}

function round0(n: number): number {
  return Math.round(n)
}

function personalSocial(insurance: SalaryInsuranceInput): number {
  const pension = round2(insurance.pensionBase * insurance.pensionPersonalRate)
  const unemployment = round2(
    insurance.unemploymentBase * insurance.unemploymentPersonalRate
  )
  return round2(pension + unemployment)
}

function personalMedical(insurance: SalaryInsuranceInput): number {
  return round2(insurance.medicalBase * insurance.medicalPersonalRate)
}

function insurancePayment(base: number, rate: number): number {
  return round2(base * rate)
}

function insuranceRowTotal(
  base: number,
  employerRate: number,
  employerCount: number,
  personalRate: number | null,
  personalCount: number | null
): number {
  const employer = round2(base * employerRate * employerCount)
  if (personalRate == null || personalCount == null) return employer
  return round2(employer + round2(base * personalRate * personalCount))
}

type InsuranceTableLine = {
  key: string
  group: "social" | "medical" | "housing"
  groupLabel: string
  label: string
  base: number
  employerRate: number
  employerPayment: number
  employerCount: number
  personalRate: number | null
  personalPayment: number | null
  personalCount: number | null
  rowTotal: number
}

type InsuranceGroupSubtotals = {
  employer: number
  personal: number | null
}

export function computeInsuranceTable(
  insurance: SalaryInsuranceInput,
  housing: SalaryHousingFundInput
): {
  lines: InsuranceTableLine[]
  groupTotals: Record<"social" | "medical" | "housing", number>
  groupSubtotals: Record<
    "social" | "medical" | "housing",
    InsuranceGroupSubtotals
  >
} {
  const pensionEmployerPayment = insurancePayment(
    insurance.pensionBase,
    insurance.pensionEmployerRate
  )
  const pensionPersonalPayment = insurancePayment(
    insurance.pensionBase,
    insurance.pensionPersonalRate
  )
  const unemploymentEmployerPayment = insurancePayment(
    insurance.unemploymentBase,
    insurance.unemploymentEmployerRate
  )
  const unemploymentPersonalPayment = insurancePayment(
    insurance.unemploymentBase,
    insurance.unemploymentPersonalRate
  )
  const injuryEmployerPayment = insurancePayment(
    insurance.injuryBase,
    insurance.injuryEmployerRate
  )
  const medicalEmployerPayment = insurancePayment(
    insurance.medicalBase,
    insurance.medicalEmployerRate
  )
  const medicalPersonalPayment = insurancePayment(
    insurance.medicalBase,
    insurance.medicalPersonalRate
  )
  const maternityEmployerPayment = insurancePayment(
    insurance.maternityBase,
    insurance.maternityEmployerRate
  )
  const housingEmployerPayment = insurancePayment(
    housing.base,
    housing.employerRate
  )
  const housingPersonalPayment = insurancePayment(
    housing.base,
    housing.personalRate
  )

  const lines: InsuranceTableLine[] = [
    {
      key: "pension",
      group: "social",
      groupLabel: "社保",
      label: "养老保险",
      base: insurance.pensionBase,
      employerRate: insurance.pensionEmployerRate,
      employerPayment: pensionEmployerPayment,
      employerCount: insurance.pensionEmployerCount,
      personalRate: insurance.pensionPersonalRate,
      personalPayment: pensionPersonalPayment,
      personalCount: insurance.pensionPersonalCount,
      rowTotal: insuranceRowTotal(
        insurance.pensionBase,
        insurance.pensionEmployerRate,
        insurance.pensionEmployerCount,
        insurance.pensionPersonalRate,
        insurance.pensionPersonalCount
      ),
    },
    {
      key: "unemployment",
      group: "social",
      groupLabel: "社保",
      label: "失业保险",
      base: insurance.unemploymentBase,
      employerRate: insurance.unemploymentEmployerRate,
      employerPayment: unemploymentEmployerPayment,
      employerCount: insurance.unemploymentEmployerCount,
      personalRate: insurance.unemploymentPersonalRate,
      personalPayment: unemploymentPersonalPayment,
      personalCount: insurance.unemploymentPersonalCount,
      rowTotal: insuranceRowTotal(
        insurance.unemploymentBase,
        insurance.unemploymentEmployerRate,
        insurance.unemploymentEmployerCount,
        insurance.unemploymentPersonalRate,
        insurance.unemploymentPersonalCount
      ),
    },
    {
      key: "injury",
      group: "social",
      groupLabel: "社保",
      label: "工伤保险",
      base: insurance.injuryBase,
      employerRate: insurance.injuryEmployerRate,
      employerPayment: injuryEmployerPayment,
      employerCount: insurance.injuryEmployerCount,
      personalRate: null,
      personalPayment: null,
      personalCount: null,
      rowTotal: insuranceRowTotal(
        insurance.injuryBase,
        insurance.injuryEmployerRate,
        insurance.injuryEmployerCount,
        null,
        null
      ),
    },
    {
      key: "medical",
      group: "medical",
      groupLabel: "医保",
      label: "医疗保险",
      base: insurance.medicalBase,
      employerRate: insurance.medicalEmployerRate,
      employerPayment: medicalEmployerPayment,
      employerCount: insurance.medicalEmployerCount,
      personalRate: insurance.medicalPersonalRate,
      personalPayment: medicalPersonalPayment,
      personalCount: insurance.medicalPersonalCount,
      rowTotal: insuranceRowTotal(
        insurance.medicalBase,
        insurance.medicalEmployerRate,
        insurance.medicalEmployerCount,
        insurance.medicalPersonalRate,
        insurance.medicalPersonalCount
      ),
    },
    {
      key: "maternity",
      group: "medical",
      groupLabel: "医保",
      label: "生育保险",
      base: insurance.maternityBase,
      employerRate: insurance.maternityEmployerRate,
      employerPayment: maternityEmployerPayment,
      employerCount: insurance.maternityEmployerCount,
      personalRate: null,
      personalPayment: null,
      personalCount: null,
      rowTotal: insuranceRowTotal(
        insurance.maternityBase,
        insurance.maternityEmployerRate,
        insurance.maternityEmployerCount,
        null,
        null
      ),
    },
    {
      key: "housing",
      group: "housing",
      groupLabel: "公积金",
      label: "公积金",
      base: housing.base,
      employerRate: housing.employerRate,
      employerPayment: housingEmployerPayment,
      employerCount: housing.employerCount,
      personalRate: housing.personalRate,
      personalPayment: housingPersonalPayment,
      personalCount: housing.personalCount,
      rowTotal: insuranceRowTotal(
        housing.base,
        housing.employerRate,
        housing.employerCount,
        housing.personalRate,
        housing.personalCount
      ),
    },
  ]

  const groupTotals = {
    social: round2(
      lines
        .filter((line) => line.group === "social")
        .reduce((sum, line) => sum + line.rowTotal, 0)
    ),
    medical: round2(
      lines
        .filter((line) => line.group === "medical")
        .reduce((sum, line) => sum + line.rowTotal, 0)
    ),
    housing: round2(
      lines
        .filter((line) => line.group === "housing")
        .reduce((sum, line) => sum + line.rowTotal, 0)
    ),
  }

  const groupSubtotals = {
    social: {
      employer: round2(
        pensionEmployerPayment +
          unemploymentEmployerPayment +
          injuryEmployerPayment
      ),
      personal: round2(pensionPersonalPayment + unemploymentPersonalPayment),
    },
    medical: {
      employer: round2(medicalEmployerPayment + maternityEmployerPayment),
      personal: medicalPersonalPayment,
    },
    housing: {
      employer: housingEmployerPayment,
      personal: housingPersonalPayment,
    },
  }

  return { lines, groupTotals, groupSubtotals }
}

function employerInsuranceTotal(insurance: SalaryInsuranceInput): number {
  const pension = round2(
    insurance.pensionBase *
      insurance.pensionEmployerRate *
      insurance.pensionEmployerCount
  )
  const unemployment = round2(
    insurance.unemploymentBase *
      insurance.unemploymentEmployerRate *
      insurance.unemploymentEmployerCount
  )
  const injury = round2(
    insurance.injuryBase *
      insurance.injuryEmployerRate *
      insurance.injuryEmployerCount
  )
  const medical = round2(
    insurance.medicalBase *
      insurance.medicalEmployerRate *
      insurance.medicalEmployerCount
  )
  const maternity = round2(
    insurance.maternityBase *
      insurance.maternityEmployerRate *
      insurance.maternityEmployerCount
  )

  return round2(pension + unemployment + injury + medical + maternity)
}

function employerHousingTotal(housing: SalaryHousingFundInput): number {
  return round2(housing.base * housing.employerRate * housing.employerCount)
}

function poolLeaveDays(
  mode: SalaryEmployeeInput["bonusMode"],
  quotas: SalaryLeaveQuotas
): number {
  if (mode === "chen_pool") return quotas.chen
  if (mode === "lu_pool") return quotas.lu
  if (mode === "xu_pool") return quotas.xu
  return 0
}

/** 个人池 = 总收入×(1−个人扣减%) 按日出勤折算 */
function calcPersonalLeavePool(
  totalIncome: number,
  deductionRate: number,
  daysInMonth: number,
  leaveDays: number
): number {
  if (daysInMonth <= 0) return 0
  const poolIncome = totalIncome * (1 - deductionRate)
  const daily = poolIncome / daysInMonth
  return round2(daily * (daysInMonth - leaveDays))
}

function resolveDeductionRate(
  emp: SalaryEmployeeInput,
  settings: SalaryGlobalSettings
): number {
  if (
    typeof emp.deductionRate === "number" &&
    Number.isFinite(emp.deductionRate)
  ) {
    return emp.deductionRate
  }
  return defaultDeductionRateForMode(emp.bonusMode, settings)
}

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/

function monthOffset(startMonth: string, month: string): number {
  if (!monthPattern.test(startMonth) || !monthPattern.test(month)) {
    return Number.NaN
  }
  const [sy, sm] = startMonth.split("-").map(Number)
  const [my, mm] = month.split("-").map(Number)
  return (my - sy) * 12 + (mm - sm)
}

/** 单笔分期在指定月份的应摊金额；不在期内返回 0 */
export function installmentAmountForMonth(
  plan: SalaryEquipmentInstallment,
  month: string
): number {
  const offset = monthOffset(plan.startMonth, month)
  if (!Number.isFinite(offset) || offset < 0 || offset >= plan.months) return 0
  if (plan.months <= 0 || plan.totalAmount <= 0) return 0
  const monthly = round2(plan.totalAmount / plan.months)
  if (offset === plan.months - 1) {
    return round2(plan.totalAmount - monthly * (plan.months - 1))
  }
  return monthly
}

/** 多笔设备分期在指定月份的应摊合计 */
export function calcEquipmentCostForMonth(
  plans: SalaryEquipmentInstallment[],
  month: string
): number {
  let sum = 0
  for (const plan of plans) {
    sum += installmentAmountForMonth(plan, month)
  }
  return round2(sum)
}

/** 其他成本项目费用加总 */
export function calcOtherCostFromItems(items: SalaryOtherCostItem[]): number {
  let sum = 0
  for (const item of items) {
    sum += item.amount
  }
  return round2(sum)
}

function calcActualReceipt(
  totalIncome: number,
  shareRatio: number,
  deductionRate: number
): number {
  return round0(totalIncome * shareRatio * (1 - deductionRate))
}

function calcTieredBonus(
  actualReceipt: number,
  thresholds: SalaryTierThresholds,
  rates: SalaryTierRates,
  plantingBonus: number,
  deductions: number
): number {
  const caps = [
    thresholds.tier1,
    thresholds.tier2,
    thresholds.tier3,
    thresholds.tier4,
    thresholds.tier5,
  ]
  const tierRates = [
    rates.tier1Rate,
    rates.tier2Rate,
    rates.tier3Rate,
    rates.tier4Rate,
    rates.tier5Rate,
    rates.tier6Rate,
  ]

  let commission = 0
  let prev = 0

  for (let i = 0; i < caps.length; i++) {
    if (actualReceipt <= prev) break
    commission += (Math.min(actualReceipt, caps[i]) - prev) * tierRates[i]
    prev = caps[i]
    if (actualReceipt <= caps[i]) {
      return round2(commission + plantingBonus - deductions)
    }
  }
  const lastCap = caps[caps.length - 1]
  if (actualReceipt > lastCap) {
    commission += (actualReceipt - lastCap) * tierRates[tierRates.length - 1]
  }
  return round2(commission + plantingBonus - deductions)
}

function computeEmployee(
  emp: SalaryEmployeeInput,
  ctx: {
    totalIncome: number
    globalSettings: SalaryGlobalSettings
    daysInMonth: number
    workingDays: number
    leaveQuotas: SalaryLeaveQuotas
    social: number
    medical: number
    priorBonusByName: Record<string, number>
  }
): SalaryEmployeeComputed {
  const leaveOffset =
    ctx.workingDays > 0
      ? round2((emp.baseSalary * emp.leaveDays) / ctx.workingDays)
      : 0
  const priorBonus = ctx.priorBonusByName[emp.name] ?? 0
  const priorBonusCarryover = Math.min(0, priorBonus)
  const deductedBase = round2(
    emp.baseSalary - leaveOffset + priorBonusCarryover
  )
  const deductionRate = resolveDeductionRate(emp, ctx.globalSettings)
  const actualReceipt =
    emp.bonusMode === "tiered"
      ? calcActualReceipt(ctx.totalIncome, emp.shareRatio, deductionRate)
      : 0
  const plantingBonus = round2(
    emp.plantingCount *
      plantingBonusPerUnitForEmployee(emp.name, ctx.globalSettings)
  )
  const deductions = round2(emp.housingFund + ctx.social + ctx.medical)
  const tierRates = tierRatesForTitle(emp.title, ctx.globalSettings)

  const bonus =
    emp.bonusMode === "tiered"
      ? calcTieredBonus(
          actualReceipt,
          ctx.globalSettings.tierThresholds,
          tierRates,
          plantingBonus,
          deductions
        )
      : calcPersonalLeavePool(
          ctx.totalIncome,
          deductionRate,
          ctx.daysInMonth,
          poolLeaveDays(emp.bonusMode, ctx.leaveQuotas)
        ) *
          poolBonusRateForMode(emp.bonusMode, ctx.globalSettings) +
        plantingBonus -
        deductions

  return {
    ...emp,
    leaveOffset,
    deductedBase,
    actualReceipt,
    plantingBonus,
    socialInsurance: ctx.social,
    medicalInsurance: ctx.medical,
    bonus: round2(bonus),
    monthlySalary: round2(deductedBase + bonus),
  }
}

export function computeSalarySheet(
  data: SalarySheetData,
  context: SalaryComputeContext
): SalarySheetComputed {
  const { utilities, rent, materials, planting, processing } = data.costItems
  const otherCost = calcOtherCostFromItems(
    context.globalSettings.otherCostItems
  )
  const costTotal = round2(materials + planting + otherCost + processing)

  const netIncome = round2(data.summary.totalIncome - costTotal)

  const social = personalSocial(data.insurance)
  const medical = personalMedical(data.insurance)
  const priorBonusByName = context.priorBonusByName ?? {}

  const employees = data.employees.map((emp) =>
    computeEmployee(emp, {
      totalIncome: data.summary.totalIncome,
      globalSettings: context.globalSettings,
      daysInMonth: data.summary.daysInMonth,
      workingDays: data.summary.workingDays,
      leaveQuotas: data.leaveQuotas,
      social,
      medical,
      priorBonusByName,
    })
  )

  const totals = employees.reduce(
    (acc, row) => ({
      deductedBase: acc.deductedBase + row.deductedBase,
      shareRatio: acc.shareRatio + row.shareRatio,
      bonus: acc.bonus + (row.bonus > 0 ? row.bonus : 0),
      monthlySalary: acc.monthlySalary + row.monthlySalary,
    }),
    { deductedBase: 0, shareRatio: 0, bonus: 0, monthlySalary: 0 }
  )

  const insuranceEmployerTotal = round2(
    employerInsuranceTotal(data.insurance) +
      employerHousingTotal(data.housingFund)
  )

  const employeePayrollTotal = round2(totals.monthlySalary)
  const equipmentCost = calcEquipmentCostForMonth(
    context.globalSettings.equipmentInstallments,
    context.month
  )

  const costGrandTotal = round2(
    utilities +
      rent +
      materials +
      planting +
      processing +
      otherCost +
      equipmentCost +
      insuranceEmployerTotal +
      employeePayrollTotal
  )

  const remaining = round2(data.summary.totalIncome - costGrandTotal)

  return {
    netIncome,
    profitRate:
      data.summary.totalIncome > 0 ? remaining / data.summary.totalIncome : 0,
    employees,
    totals: {
      deductedBase: round2(totals.deductedBase),
      shareRatio: round2(totals.shareRatio),
      bonus: round2(totals.bonus),
      monthlySalary: round2(totals.monthlySalary),
    },
    insuranceEmployerTotal,
    equipmentCost,
    otherCost,
    costGrandTotal,
    remaining,
    employeePayrollTotal,
  }
}

export function buildPriorBonusMap(
  month: string,
  sheets: Record<string, SalarySheetData>,
  getPrevious: (month: string) => string | null,
  globalSettings: SalaryGlobalSettings
): Record<string, number> {
  return collectPriorBonus(
    month,
    sheets,
    getPrevious,
    globalSettings,
    new Set([month])
  )
}

/**
 * priorBonusByName 的逐月递归。visited 记录已展开的月份，避免
 * getPrevious 成环（自环或 A→B→A）时无限递归直至 RangeError。
 */
function collectPriorBonus(
  month: string,
  sheets: Record<string, SalarySheetData>,
  getPrevious: (month: string) => string | null,
  globalSettings: SalaryGlobalSettings,
  visited: Set<string>
): Record<string, number> {
  const prev = getPrevious(month)
  if (!prev || !sheets[prev] || visited.has(prev)) return {}
  visited.add(prev)
  return priorBonusMapFromSheet(sheets[prev], {
    month: prev,
    globalSettings,
    priorBonusByName: collectPriorBonus(
      prev,
      sheets,
      getPrevious,
      globalSettings,
      visited
    ),
  })
}

function priorBonusMapFromSheet(
  sheet: SalarySheetData,
  context: SalaryComputeContext
): Record<string, number> {
  const computed = computeSalarySheet(sheet, context)
  return Object.fromEntries(
    computed.employees.map((row) => [row.name, row.bonus])
  )
}
