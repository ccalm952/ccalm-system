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

function insurancePayment(base: number, rate: number): number {
  return round2(base * rate);
}

function insuranceRowTotal(
  employerPayment: number,
  employerCount: number,
  personalPayment: number | null,
  personalCount: number | null,
): number {
  const employer = round2(employerPayment * employerCount);
  if (personalPayment == null || personalCount == null) return employer;
  return round2(employer + round2(personalPayment * personalCount));
}

export type InsuranceTableLine = {
  key: string;
  group: "social" | "medical" | "housing";
  groupLabel: string;
  label: string;
  base: number;
  employerRate: number;
  employerPayment: number;
  employerCount: number;
  personalRate: number | null;
  personalPayment: number | null;
  personalCount: number | null;
  rowTotal: number;
};

export type InsuranceGroupSubtotals = {
  employer: number;
  personal: number | null;
};

export function computeInsuranceTable(
  insurance: SalaryInsuranceInput,
  housing: SalaryHousingFundInput,
): {
  lines: InsuranceTableLine[];
  groupTotals: Record<"social" | "medical" | "housing", number>;
  groupSubtotals: Record<"social" | "medical" | "housing", InsuranceGroupSubtotals>;
} {
  const pensionEmployerPayment = insurancePayment(
    insurance.pensionBase,
    insurance.pensionEmployerRate,
  );
  const pensionPersonalPayment = insurancePayment(
    insurance.pensionBase,
    insurance.pensionPersonalRate,
  );
  const unemploymentEmployerPayment = insurancePayment(
    insurance.unemploymentBase,
    insurance.unemploymentEmployerRate,
  );
  const unemploymentPersonalPayment = insurancePayment(
    insurance.unemploymentBase,
    insurance.unemploymentPersonalRate,
  );
  const injuryEmployerPayment = insurancePayment(
    insurance.injuryBase,
    insurance.injuryEmployerRate,
  );
  const medicalEmployerPayment = insurancePayment(
    insurance.medicalBase,
    insurance.medicalEmployerRate,
  );
  const medicalPersonalPayment = insurancePayment(
    insurance.medicalBase,
    insurance.medicalPersonalRate,
  );
  const maternityEmployerPayment = insurancePayment(
    insurance.maternityBase,
    insurance.maternityEmployerRate,
  );
  const housingEmployerPayment = insurancePayment(housing.base, housing.employerRate);
  const housingPersonalPayment = insurancePayment(housing.base, housing.personalRate);

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
        pensionEmployerPayment,
        insurance.pensionEmployerCount,
        pensionPersonalPayment,
        insurance.pensionPersonalCount,
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
        unemploymentEmployerPayment,
        insurance.unemploymentEmployerCount,
        unemploymentPersonalPayment,
        insurance.unemploymentPersonalCount,
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
        injuryEmployerPayment,
        insurance.injuryEmployerCount,
        null,
        null,
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
        medicalEmployerPayment,
        insurance.medicalEmployerCount,
        medicalPersonalPayment,
        insurance.medicalPersonalCount,
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
        maternityEmployerPayment,
        insurance.maternityEmployerCount,
        null,
        null,
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
        housingEmployerPayment,
        housing.employerCount,
        housingPersonalPayment,
        housing.personalCount,
      ),
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

  const groupSubtotals = {
    social: {
      employer: round2(
        pensionEmployerPayment + unemploymentEmployerPayment + injuryEmployerPayment,
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
  };

  return { lines, groupTotals, groupSubtotals };
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
  const { utilities, rent, materials, planting, processing, other } = data.costItems;
  const costsTotal = round2(materials + planting + other);
  const processingTotal = round2(processing);
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

  const operatingTotal = round2(utilities + rent);

  const costGrandTotal = round2(
    utilities +
      rent +
      materials +
      planting +
      processing +
      other +
      insuranceEmployerTotal +
      employeePayrollTotal,
  );

  const expenseTotal = costGrandTotal;

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
    costGrandTotal,
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
