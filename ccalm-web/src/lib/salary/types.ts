type SalaryBonusMode = "tiered" | "chen_pool" | "lu_pool" | "xu_pool";

export type SalaryTierRates = {
  tier1Rate: number;
  tier2Rate: number;
  tier3Rate: number;
  tier4Rate: number;
  tier5Rate: number;
  tier6Rate: number;
};

export type SalaryEmployeeInput = {
  id: string;
  title: string;
  name: string;
  baseSalary: number;
  shareRatio: number;
  plantingCount: number;
  leaveDays: number;
  housingFund: number;
  bonusMode: SalaryBonusMode;
  /** 个人扣减比例：阶梯为实收扣减，池行为护士扣减；如 0.2 表示 20% */
  deductionRate: number;
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

/** 当月材料成本明细（名称 + 金额） */
export type SalaryMaterialLine = {
  id: string;
  name: string;
  amount: number;
};

/** 设备分期计划（全局；按起算月与期数自动计入各月「设备」成本） */
export type SalaryEquipmentInstallment = {
  id: string;
  name: string;
  /** 设备总价 */
  totalAmount: number;
  /** 分期期数（月） */
  months: number;
  /** 起算月份 YYYY-MM */
  startMonth: string;
};

/** 其他成本项目（全局；名称 + 费用，多笔加总进「其他」） */
export type SalaryOtherCostItem = {
  id: string;
  name: string;
  amount: number;
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

type SalarySummaryInput = {
  totalIncome: number;
  daysInMonth: number;
  /** 假期抵消除数（Excel R4，默认 25） */
  workingDays: number;
};

export type SalaryTierThresholds = {
  tier1: number;
  tier2: number;
  tier3: number;
  tier4: number;
  tier5: number;
};

export type SalaryGlobalSettings = {
  tierThresholds: SalaryTierThresholds;
  docTierRates: SalaryTierRates;
  asstTierRates: SalaryTierRates;
  /** 医生实收扣减比例，如 0.2 表示扣 20% */
  doctorReceiptDeductionRate: number;
  /** 护士奖金池扣减比例，净收入 = 总收入 × (1 − 该比例) */
  nurseDeductionRate: number;
  /** 陈美珍池奖金比例（相对个人池），如 0.003 表示 0.3% */
  chenPoolBonusRate: number;
  /** 卢彤池奖金比例（相对个人池），如 0.003 表示 0.3% */
  luPoolBonusRate: number;
  /** 许桦婧池奖金比例（相对个人池），如 0.002 表示 0.2% */
  xuPoolBonusRate: number;
  plantingBonusPerUnit: number;
  wuJiechenPlantingBonusPerUnit: number;
  /** 设备分期计划（可多笔；当月应摊金额自动汇总） */
  equipmentInstallments: SalaryEquipmentInstallment[];
  /** 其他成本项目（可多笔；费用加总进「其他」） */
  otherCostItems: SalaryOtherCostItem[];
};

export type SalarySheetData = {
  summary: SalarySummaryInput;
  leaveQuotas: SalaryLeaveQuotas;
  employees: SalaryEmployeeInput[];
  insurance: SalaryInsuranceInput;
  housingFund: SalaryHousingFundInput;
  costItems: SalaryCostItems;
  /** 当月材料明细；合计写入 / 计算 costItems.materials */
  materialLines: SalaryMaterialLine[];
};

export type SalaryEmployeeComputed = SalaryEmployeeInput & {
  leaveOffset: number;
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
  profitRate: number;
  employees: SalaryEmployeeComputed[];
  totals: {
    deductedBase: number;
    shareRatio: number;
    bonus: number;
    monthlySalary: number;
  };
  insuranceEmployerTotal: number;
  /** 当月设备分期应摊合计（由全局计划按月计算） */
  equipmentCost: number;
  /** 其他成本合计（由全局其他成本项目加总） */
  otherCost: number;
  costGrandTotal: number;
  remaining: number;
  employeePayrollTotal: number;
};

export type SalaryComputeContext = {
  globalSettings: SalaryGlobalSettings;
  /** 当前计算月份 YYYY-MM，用于设备分期 */
  month: string;
  priorBonusByName?: Record<string, number>;
};
