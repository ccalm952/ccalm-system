export type SalaryBonusMode = "tiered" | "chen_pool" | "lu_pool" | "xu_pool";

export type SalaryEmployeeInput = {
  id: string;
  title: string;
  name: string;
  baseSalary: number;
  shareRatio: number;
  tier1Rate: number;
  tier2Rate: number;
  tier3Rate: number;
  plantingCount: number;
  plantingBonusPerUnit: number;
  leaveDays: number;
  housingFund: number;
  bonusMode: SalaryBonusMode;
};

export type SalaryInsuranceInput = {
  pensionBase: number;
  pensionEmployerRate: number;
  pensionEmployerCount: number;
  pensionPersonalRate: number;
  pensionPersonalCount: number;
  unemploymentBase: number;
  unemploymentEmployerRate: number;
  unemploymentEmployerCount: number;
  unemploymentPersonalRate: number;
  unemploymentPersonalCount: number;
  injuryBase: number;
  injuryEmployerRate: number;
  injuryEmployerCount: number;
  medicalBase: number;
  medicalEmployerRate: number;
  medicalEmployerCount: number;
  medicalPersonalRate: number;
  medicalPersonalCount: number;
  maternityBase: number;
  maternityEmployerRate: number;
  maternityEmployerCount: number;
};

export type SalaryHousingFundInput = {
  base: number;
  employerRate: number;
  employerCount: number;
  personalRate: number;
  personalCount: number;
};

export type SalaryCostItems = {
  utilities: number;
  rent: number;
  materials: number;
  planting: number;
  processing: number;
  other: number;
};

export type SalaryCostLine = {
  id: string;
  label: string;
  amount: number;
};

export type SalaryProcessingLine = {
  id: string;
  label: string;
  amount: number;
};

export type SalaryOperatingLine = {
  id: string;
  label: string;
  amount: number;
};

export type SalaryLeaveQuotas = {
  chen: number;
  lu: number;
  xu: number;
};

export type SalaryOperatingExpenses = {
  utilities: number;
  rent: number;
};

export type SalarySummaryInput = {
  totalIncome: number;
  daysInMonth: number;
  /** 假期抵消除数（Excel R4，默认 25） */
  workingDays: number;
};

export type SalaryTierThresholds = {
  tier1: number;
  tier2: number;
  tier3: number;
};

export type SalarySheetData = {
  summary: SalarySummaryInput;
  leaveQuotas: SalaryLeaveQuotas;
  tierThresholds: SalaryTierThresholds;
  employees: SalaryEmployeeInput[];
  insurance: SalaryInsuranceInput;
  housingFund: SalaryHousingFundInput;
  costItems: SalaryCostItems;
};

export type SalaryEmployeeComputed = SalaryEmployeeInput & {
  leaveOffset: number;
  priorBonusCarryover: number;
  deductedBase: number;
  actualReceipt: number;
  plantingBonus: number;
  socialInsurance: number;
  medicalInsurance: number;
  bonus: number;
  monthlySalary: number;
};

export type SalarySheetComputed = {
  netIncome: number;
  costTotal: number;
  costsTotal: number;
  processingTotal: number;
  operatingTotal: number;
  leavePools: SalaryLeaveQuotas;
  profit: number;
  profitRate: number;
  employees: SalaryEmployeeComputed[];
  totals: {
    deductedBase: number;
    shareRatio: number;
    bonus: number;
    monthlySalary: number;
  };
  insuranceEmployerTotal: number;
  insurancePersonalTotal: number;
  expenseTotal: number;
  costGrandTotal: number;
  remaining: number;
  employeePayrollTotal: number;
};

export type SalaryComputeContext = {
  priorBonusByName?: Record<string, number>;
};
