import type {
  SalaryComputeContext,
  SalaryEmployeeComputed,
  SalaryEmployeeInput,
  SalaryHousingFundInput,
  SalaryInsuranceInput,
  SalaryLeaveQuotas,
  SalarySheetComputed,
  SalarySheetData,
  SalaryTierThresholds,
} from "./types";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round0(n: number): number {
  return Math.round(n);
}

function personalSocial(insurance: SalaryInsuranceInput): number {
  const pension = round2(insurance.pensionBase * insurance.pensionPersonalRate);
  const unemployment = round2(
    insurance.unemploymentBase * insurance.unemploymentPersonalRate,
  );
  return round2(pension + unemployment);
}

function personalMedical(insurance: SalaryInsuranceInput): number {
  return round2(insurance.medicalBase * insurance.medicalPersonalRate);
}

function employerLineSubtotal(base: number, rate: number, count: number): number {
  return round2(base * rate * count);
}

function personalLineSubtotal(base: number, rate: number, count: number): number {
  return round2(base * rate * count);
}

export type InsuranceTableLine = {
  key: string;
  group: "social" | "medical" | "housing";
  groupLabel: string;
  label: string;
  base: number;
  employerRate: number;
  employerCount: number;
  employerSubtotal: number;
  personalRate: number | null;
  personalCount: number | null;
  personalSubtotal: number | null;
  rowTotal: number;
};

export function computeInsuranceTable(
  insurance: SalaryInsuranceInput,
  housing: SalaryHousingFundInput,
): { lines: InsuranceTableLine[]; groupTotals: Record<"social" | "medical" | "housing", number> } {
  const pensionEmployer = employerLineSubtotal(
    insurance.pensionBase,
    insurance.pensionEmployerRate,
    insurance.pensionEmployerCount,
  );
  const pensionPersonal = personalLineSubtotal(
    insurance.pensionBase,
    insurance.pensionPersonalRate,
    insurance.pensionPersonalCount,
  );
  const unemploymentEmployer = employerLineSubtotal(
    insurance.unemploymentBase,
    insurance.unemploymentEmployerRate,
    insurance.unemploymentEmployerCount,
  );
  const unemploymentPersonal = personalLineSubtotal(
    insurance.unemploymentBase,
    insurance.unemploymentPersonalRate,
    insurance.unemploymentPersonalCount,
  );
  const injuryEmployer = employerLineSubtotal(
    insurance.injuryBase,
    insurance.injuryEmployerRate,
    insurance.injuryEmployerCount,
  );
  const medicalEmployer = employerLineSubtotal(
    insurance.medicalBase,
    insurance.medicalEmployerRate,
    insurance.medicalEmployerCount,
  );
  const medicalPersonal = personalLineSubtotal(
    insurance.medicalBase,
    insurance.medicalPersonalRate,
    insurance.medicalPersonalCount,
  );
  const maternityEmployer = employerLineSubtotal(
    insurance.maternityBase,
    insurance.maternityEmployerRate,
    insurance.maternityEmployerCount,
  );
  const housingEmployer = employerLineSubtotal(
    housing.base,
    housing.employerRate,
    housing.employerCount,
  );
  const housingPersonal = personalLineSubtotal(
    housing.base,
    housing.personalRate,
    housing.personalCount,
  );

  const lines: InsuranceTableLine[] = [
    {
      key: "pension",
      group: "social",
      groupLabel: "社保",
      label: "养老保险",
      base: insurance.pensionBase,
      employerRate: insurance.pensionEmployerRate,
      employerCount: insurance.pensionEmployerCount,
      employerSubtotal: pensionEmployer,
      personalRate: insurance.pensionPersonalRate,
      personalCount: insurance.pensionPersonalCount,
      personalSubtotal: pensionPersonal,
      rowTotal: round2(pensionEmployer + pensionPersonal),
    },
    {
      key: "unemployment",
      group: "social",
      groupLabel: "社保",
      label: "失业保险",
      base: insurance.unemploymentBase,
      employerRate: insurance.unemploymentEmployerRate,
      employerCount: insurance.unemploymentEmployerCount,
      employerSubtotal: unemploymentEmployer,
      personalRate: insurance.unemploymentPersonalRate,
      personalCount: insurance.unemploymentPersonalCount,
      personalSubtotal: unemploymentPersonal,
      rowTotal: round2(unemploymentEmployer + unemploymentPersonal),
    },
    {
      key: "injury",
      group: "social",
      groupLabel: "社保",
      label: "工伤保险",
      base: insurance.injuryBase,
      employerRate: insurance.injuryEmployerRate,
      employerCount: insurance.injuryEmployerCount,
      employerSubtotal: injuryEmployer,
      personalRate: null,
      personalCount: null,
      personalSubtotal: null,
      rowTotal: injuryEmployer,
    },
    {
      key: "medical",
      group: "medical",
      groupLabel: "医保",
      label: "医疗保险",
      base: insurance.medicalBase,
      employerRate: insurance.medicalEmployerRate,
      employerCount: insurance.medicalEmployerCount,
      employerSubtotal: medicalEmployer,
      personalRate: insurance.medicalPersonalRate,
      personalCount: insurance.medicalPersonalCount,
      personalSubtotal: medicalPersonal,
      rowTotal: round2(medicalEmployer + medicalPersonal),
    },
    {
      key: "maternity",
      group: "medical",
      groupLabel: "医保",
      label: "生育保险",
      base: insurance.maternityBase,
      employerRate: insurance.maternityEmployerRate,
      employerCount: insurance.maternityEmployerCount,
      employerSubtotal: maternityEmployer,
      personalRate: null,
      personalCount: null,
      personalSubtotal: null,
      rowTotal: maternityEmployer,
    },
    {
      key: "housing",
      group: "housing",
      groupLabel: "公积金",
      label: "公积金",
      base: housing.base,
      employerRate: housing.employerRate,
      employerCount: housing.employerCount,
      employerSubtotal: housingEmployer,
      personalRate: housing.personalRate,
      personalCount: housing.personalCount,
      personalSubtotal: housingPersonal,
      rowTotal: round2(housingEmployer + housingPersonal),
    },
  ];

  const groupTotals = {
    social: round2(
      lines.filter((line) => line.group === "social").reduce((sum, line) => sum + line.rowTotal, 0),
    ),
    medical: round2(
      lines.filter((line) => line.group === "medical").reduce((sum, line) => sum + line.rowTotal, 0),
    ),
    housing: round2(
      lines.filter((line) => line.group === "housing").reduce((sum, line) => sum + line.rowTotal, 0),
    ),
  };

  return { lines, groupTotals };
}

function employerInsuranceTotal(insurance: SalaryInsuranceInput): number {
  const pension = round2(insurance.pensionBase * insurance.pensionEmployerRate);
  const unemployment = round2(
    insurance.unemploymentBase * insurance.unemploymentEmployerRate,
  );
  const injury = round2(insurance.injuryBase * insurance.injuryEmployerRate);
  const medical = round2(insurance.medicalBase * insurance.medicalEmployerRate);
  const maternity = round2(insurance.maternityBase * insurance.maternityEmployerRate);

  return round2(
    pension * insurance.pensionEmployerCount +
      unemployment * insurance.unemploymentEmployerCount +
      injury * insurance.injuryEmployerCount +
      medical * insurance.medicalEmployerCount +
      maternity * insurance.maternityEmployerCount,
  );
}

function employerHousingTotal(housing: SalaryHousingFundInput): number {
  return round2(housing.base * housing.employerRate * housing.employerCount);
}

function calcLeavePools(
  netIncome: number,
  daysInMonth: number,
  quotas: SalaryLeaveQuotas,
): SalaryLeaveQuotas {
  if (daysInMonth <= 0) {
    return { chen: 0, lu: 0, xu: 0 };
  }
  const daily = netIncome / daysInMonth;
  return {
    chen: round2(daily * (daysInMonth - quotas.chen)),
    lu: round2(daily * (daysInMonth - quotas.lu)),
    xu: round2(daily * (daysInMonth - quotas.xu)),
  };
}

function calcTieredBonus(
  actualReceipt: number,
  thresholds: SalaryTierThresholds,
  rates: Pick<SalaryEmployeeInput, "tier1Rate" | "tier2Rate" | "tier3Rate">,
  plantingBonus: number,
  deductions: number,
): number {
  const { tier1, tier2 } = thresholds;
  const { tier1Rate, tier2Rate, tier3Rate } = rates;

  if (actualReceipt <= tier1) {
    return actualReceipt * tier1Rate + plantingBonus - deductions;
  }
  if (actualReceipt <= tier2) {
    return (
      tier1 * tier1Rate +
      (actualReceipt - tier1) * tier2Rate +
      plantingBonus -
      deductions
    );
  }
  return (
    tier1 * tier1Rate +
    (tier2 - tier1) * tier2Rate +
    (actualReceipt - tier2) * tier3Rate +
    plantingBonus -
    deductions
  );
}

function poolBonusRate(mode: SalaryEmployeeInput["bonusMode"]): number {
  if (mode === "chen_pool") return 0.003;
  if (mode === "lu_pool") return 0.003;
  if (mode === "xu_pool") return 0.002;
  return 0;
}

function poolAmount(
  mode: SalaryEmployeeInput["bonusMode"],
  pools: SalaryLeaveQuotas,
): number {
  if (mode === "chen_pool") return pools.chen;
  if (mode === "lu_pool") return pools.lu;
  if (mode === "xu_pool") return pools.xu;
  return 0;
}

function computeEmployee(
  emp: SalaryEmployeeInput,
  ctx: {
    netIncome: number;
    daysInMonth: number;
    workingDays: number;
    thresholds: SalaryTierThresholds;
    leavePools: SalaryLeaveQuotas;
    social: number;
    medical: number;
    priorBonusByName: Record<string, number>;
  },
): SalaryEmployeeComputed {
  const leaveOffset =
    ctx.workingDays > 0
      ? round2((emp.baseSalary * emp.leaveDays) / ctx.workingDays)
      : 0;
  const priorBonus = ctx.priorBonusByName[emp.name] ?? 0;
  const priorBonusCarryover = Math.min(0, priorBonus);
  const deductedBase = round2(emp.baseSalary - leaveOffset + priorBonusCarryover);
  const actualReceipt = round0(ctx.netIncome * emp.shareRatio);
  const plantingBonus = round2(emp.plantingCount * emp.plantingBonusPerUnit);
  const deductions = round2(emp.housingFund + ctx.social + ctx.medical);

  const bonus =
    emp.bonusMode === "tiered"
      ? calcTieredBonus(
          actualReceipt,
          ctx.thresholds,
          emp,
          plantingBonus,
          deductions,
        )
      : poolAmount(emp.bonusMode, ctx.leavePools) * poolBonusRate(emp.bonusMode) +
        plantingBonus -
        deductions;

  return {
    ...emp,
    leaveOffset,
    priorBonusCarryover,
    deductedBase,
    actualReceipt,
    plantingBonus,
    socialInsurance: ctx.social,
    medicalInsurance: ctx.medical,
    bonus: round2(bonus),
    monthlySalary: round2(deductedBase + bonus),
  };
}

export function computeSalarySheet(
  data: SalarySheetData,
  context: SalaryComputeContext = {},
): SalarySheetComputed {
  const costsTotal = round2(data.costs.reduce((s, line) => s + line.amount, 0));
  const processingTotal = round2(data.processing.reduce((s, line) => s + line.amount, 0));
  const costTotal = round2(costsTotal + processingTotal);

  const netIncome = round2(data.summary.totalIncome - costTotal);
  const leavePools = calcLeavePools(
    netIncome,
    data.summary.daysInMonth,
    data.leaveQuotas,
  );

  const social = personalSocial(data.insurance);
  const medical = personalMedical(data.insurance);
  const priorBonusByName = context.priorBonusByName ?? {};

  const employees = data.employees.map((emp) =>
    computeEmployee(emp, {
      netIncome,
      daysInMonth: data.summary.daysInMonth,
      workingDays: data.summary.workingDays,
      thresholds: data.tierThresholds,
      leavePools,
      social,
      medical,
      priorBonusByName,
    }),
  );

  const totals = employees.reduce(
    (acc, row) => ({
      deductedBase: acc.deductedBase + row.deductedBase,
      shareRatio: acc.shareRatio + row.shareRatio,
      bonus: acc.bonus + row.bonus,
      monthlySalary: acc.monthlySalary + row.monthlySalary,
    }),
    { deductedBase: 0, shareRatio: 0, bonus: 0, monthlySalary: 0 },
  );

  const insuranceEmployerTotal = round2(
    employerInsuranceTotal(data.insurance) + employerHousingTotal(data.housingFund),
  );

  const employeePayrollTotal = round2(totals.monthlySalary);

  const operatingTotal = round2(
    data.operating.reduce((sum, line) => sum + line.amount, 0),
  );

  const expenseTotal = round2(
    operatingTotal + employeePayrollTotal + insuranceEmployerTotal + costTotal,
  );

  const remaining = round2(data.summary.totalIncome - expenseTotal);

  return {
    netIncome,
    costTotal,
    costsTotal,
    processingTotal,
    operatingTotal,
    leavePools,
    profit: remaining,
    profitRate: data.summary.totalIncome > 0 ? remaining / data.summary.totalIncome : 0,
    employees,
    totals: {
      deductedBase: round2(totals.deductedBase),
      shareRatio: round2(totals.shareRatio),
      bonus: round2(totals.bonus),
      monthlySalary: round2(totals.monthlySalary),
    },
    insuranceEmployerTotal,
    insurancePersonalTotal: round2(social + medical),
    expenseTotal,
    remaining,
    employeePayrollTotal,
  };
}

export function buildPriorBonusMap(
  month: string,
  sheets: Record<string, SalarySheetData>,
  getPrevious: (month: string) => string | null,
): Record<string, number> {
  const prev = getPrevious(month);
  if (!prev || !sheets[prev]) return {};
  return priorBonusMapFromSheet(sheets[prev], {
    priorBonusByName: buildPriorBonusMap(prev, sheets, getPrevious),
  });
}

export function priorBonusMapFromSheet(
  sheet: SalarySheetData,
  context: SalaryComputeContext = {},
): Record<string, number> {
  const computed = computeSalarySheet(sheet, context);
  return Object.fromEntries(computed.employees.map((row) => [row.name, row.bonus]));
}
