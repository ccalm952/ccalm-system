import dayjs from "dayjs";

import { round2 } from "./calc";
import type {
  SalaryCostItems,
  SalaryCostLine,
  SalaryOperatingExpenses,
  SalaryOperatingLine,
  SalaryProcessingLine,
  SalarySheetData,
} from "./types";

let employeeId = 0;
function emp(
  partial: Omit<SalarySheetData["employees"][number], "id">,
): SalarySheetData["employees"][number] {
  employeeId += 1;
  return { id: `emp-${employeeId}`, ...partial };
}

/** 与 Excel「2605」工作表一致的默认模板 */
/** 根据 YYYY-MM（如 2026-06 / 标签 2606）返回当月自然日天数 */
export function calendarDaysForMonth(month: string): number {
  return dayjs(`${month}-01`).daysInMonth();
}

export function applyMonthCalendar(sheet: SalarySheetData, month: string): SalarySheetData {
  return {
    ...sheet,
    summary: {
      ...sheet.summary,
      daysInMonth: calendarDaysForMonth(month),
    },
  };
}

export function createDefaultSalarySheet(month: string): SalarySheetData {
  employeeId = 0;
  const daysInMonth = calendarDaysForMonth(month);

  return {
    summary: {
      totalIncome: 0,
      daysInMonth,
      workingDays: 25,
    },
    leaveQuotas: { chen: 0, lu: 0, xu: 0 },
    tierThresholds: { tier1: 50000, tier2: 100000, tier3: 150000 },
    employees: [
      emp({
        title: "执业医师",
        name: "胡芊芊",
        baseSalary: 12000,
        shareRatio: 0.28,
        tier1Rate: 0.1,
        tier2Rate: 0.11,
        tier3Rate: 0.12,
        plantingCount: 0,
        plantingBonusPerUnit: 50,
        leaveDays: 0,
        housingFund: 700,
        bonusMode: "tiered",
      }),
      emp({
        title: "执业医师",
        name: "宁福月",
        baseSalary: 12000,
        shareRatio: 0.28,
        tier1Rate: 0.1,
        tier2Rate: 0.11,
        tier3Rate: 0.12,
        plantingCount: 0,
        plantingBonusPerUnit: 50,
        leaveDays: 0,
        housingFund: 700,
        bonusMode: "tiered",
      }),
      emp({
        title: "执业医师",
        name: "骆群鸿",
        baseSalary: 12000,
        shareRatio: 0.28,
        tier1Rate: 0.1,
        tier2Rate: 0.11,
        tier3Rate: 0.12,
        plantingCount: 0,
        plantingBonusPerUnit: 50,
        leaveDays: 0,
        housingFund: 700,
        bonusMode: "tiered",
      }),
      emp({
        title: "助理医师",
        name: "吴介尘",
        baseSalary: 8000,
        shareRatio: 0.01,
        tier1Rate: 0.07,
        tier2Rate: 0.08,
        tier3Rate: 0.09,
        plantingCount: 0,
        plantingBonusPerUnit: 500,
        leaveDays: 0,
        housingFund: 0,
        bonusMode: "tiered",
      }),
      emp({
        title: "助理医师",
        name: "吴彤",
        baseSalary: 5500,
        shareRatio: 0.01,
        tier1Rate: 0.07,
        tier2Rate: 0.08,
        tier3Rate: 0.09,
        plantingCount: 0,
        plantingBonusPerUnit: 50,
        leaveDays: 0,
        housingFund: 0,
        bonusMode: "tiered",
      }),
      emp({
        title: "助理医师",
        name: "余煌",
        baseSalary: 5500,
        shareRatio: 0.01,
        tier1Rate: 0.07,
        tier2Rate: 0.08,
        tier3Rate: 0.09,
        plantingCount: 0,
        plantingBonusPerUnit: 50,
        leaveDays: 0,
        housingFund: 0,
        bonusMode: "tiered",
      }),
      emp({
        title: "护士",
        name: "陈美珍",
        baseSalary: 4700,
        shareRatio: 0,
        tier1Rate: 0,
        tier2Rate: 0,
        tier3Rate: 0,
        plantingCount: 0,
        plantingBonusPerUnit: 50,
        leaveDays: 0,
        housingFund: 300,
        bonusMode: "chen_pool",
      }),
      emp({
        title: "护士",
        name: "卢彤",
        baseSalary: 5500,
        shareRatio: 0,
        tier1Rate: 0,
        tier2Rate: 0,
        tier3Rate: 0,
        plantingCount: 0,
        plantingBonusPerUnit: 50,
        leaveDays: 0,
        housingFund: 700,
        bonusMode: "lu_pool",
      }),
      emp({
        title: "护士",
        name: "许桦婧",
        baseSalary: 4500,
        shareRatio: 0,
        tier1Rate: 0,
        tier2Rate: 0,
        tier3Rate: 0,
        plantingCount: 0,
        plantingBonusPerUnit: 50,
        leaveDays: 0,
        housingFund: 0,
        bonusMode: "xu_pool",
      }),
    ],
    insurance: {
      pensionBase: 4043,
      pensionEmployerRate: 0.16,
      pensionEmployerCount: 11,
      pensionPersonalRate: 0.08,
      pensionPersonalCount: 11,
      unemploymentBase: 4043,
      unemploymentEmployerRate: 0.005,
      unemploymentEmployerCount: 11,
      unemploymentPersonalRate: 0.005,
      unemploymentPersonalCount: 11,
      injuryBase: 4414,
      injuryEmployerRate: 0.002,
      injuryEmployerCount: 11,
      medicalBase: 4433,
      medicalEmployerRate: 0.075,
      medicalEmployerCount: 12,
      medicalPersonalRate: 0.02,
      medicalPersonalCount: 12,
      maternityBase: 4433,
      maternityEmployerRate: 0.005,
      maternityEmployerCount: 12,
    },
    housingFund: {
      base: 1200,
      employerRate: 5 / 12,
      employerCount: 5,
      personalRate: 7 / 12,
      personalCount: 4,
    },
    costItems: {
      utilities: 3000,
      rent: 7500,
      materials: 0,
      planting: 0,
      processing: 0,
      other: 0,
    },
  };
}

function isLegacyOperatingExpenses(
  operating: unknown,
): operating is SalaryOperatingExpenses {
  return (
    operating != null &&
    typeof operating === "object" &&
    !Array.isArray(operating) &&
    "utilities" in operating &&
    "rent" in operating
  );
}

function isOperatingLine(value: unknown): value is SalaryOperatingLine {
  if (!value || typeof value !== "object") return false;
  const line = value as SalaryOperatingLine;
  return typeof line.id === "string" && typeof line.label === "string" && typeof line.amount === "number";
}

export function normalizeOperatingExpenses(operating: unknown): SalaryOperatingLine[] {
  if (Array.isArray(operating)) {
    return operating.filter(isOperatingLine).map((line) => ({ ...line }));
  }
  if (isLegacyOperatingExpenses(operating)) {
    return [
      { id: nextEntityId("op"), label: "水电", amount: operating.utilities },
      { id: nextEntityId("op"), label: "租金", amount: operating.rent },
    ];
  }
  return [
    { id: nextEntityId("op"), label: "水电", amount: 3000 },
    { id: nextEntityId("op"), label: "租金", amount: 7500 },
  ];
}

function costAmountByLabel(lines: { label: string; amount: number }[], label: string): number {
  return lines.find((line) => line.label === label)?.amount ?? 0;
}

export function normalizeCostItems(data: {
  costItems?: Partial<SalaryCostItems>;
  costs?: SalaryCostLine[];
  processing?: SalaryProcessingLine[];
  operating?: unknown;
}): SalaryCostItems {
  if (data.costItems && typeof data.costItems === "object") {
    const items = data.costItems;
    const num = (value: unknown) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    };
    return {
      utilities: num(items.utilities),
      rent: num(items.rent),
      materials: num(items.materials),
      planting: num(items.planting),
      processing: num(items.processing),
      other: num(items.other),
    };
  }

  const operating = normalizeOperatingExpenses(data.operating);
  const costs = Array.isArray(data.costs) ? data.costs : [];
  const processingLines = Array.isArray(data.processing) ? data.processing : [];

  return {
    utilities: costAmountByLabel(operating, "水电"),
    rent: costAmountByLabel(operating, "租金"),
    materials: costAmountByLabel(costs, "材料"),
    planting: costAmountByLabel(costs, "种植"),
    processing: round2(processingLines.reduce((sum, line) => sum + line.amount, 0)),
    other: round2(
      costs
        .filter((line) => line.label !== "材料" && line.label !== "种植")
        .reduce((sum, line) => sum + line.amount, 0),
    ),
  };
}

type SalarySheetDataLike = SalarySheetData & {
  costs?: SalaryCostLine[];
  processing?: SalaryProcessingLine[];
  operating?: unknown;
};

export function isSalarySheetData(data: unknown): data is SalarySheetDataLike {
  if (!data || typeof data !== "object") return false;
  const sheet = data as SalarySheetDataLike;
  return (
    sheet.summary != null &&
    Array.isArray(sheet.employees) &&
    sheet.leaveQuotas != null &&
    (sheet.costItems != null ||
      Array.isArray(sheet.costs) ||
      Array.isArray(sheet.processing) ||
      Array.isArray(sheet.operating) ||
      isLegacyOperatingExpenses(sheet.operating))
  );
}

export function normalizeSalarySheet(data: unknown, month: string): SalarySheetData {
  if (!isSalarySheetData(data)) {
    return createDefaultSalarySheet(month);
  }

  return applyMonthCalendar(
    {
      summary: {
        ...data.summary,
        workingDays: data.summary.workingDays || 25,
      },
      leaveQuotas: data.leaveQuotas,
      tierThresholds: data.tierThresholds,
      employees: data.employees,
      insurance: data.insurance,
      housingFund: data.housingFund,
      costItems: normalizeCostItems(data),
    },
    month,
  );
}
/** 上一自然月；传入已有月份时仅当上月也在列表中才返回 */
export function previousSalaryMonth(
  month: string,
  existingMonths?: Iterable<string>,
): string | null {
  const prev = dayjs(`${month}-01`).subtract(1, "month").format("YYYY-MM");
  if (existingMonths === undefined) return prev;
  const set =
    existingMonths instanceof Set ? existingMonths : new Set(existingMonths);
  return set.has(prev) ? prev : null;
}

export function formatSalaryMonthTab(month: string): string {
  const [y, m] = month.split("-");
  return `${y.slice(2)}${m}`;
}

let entitySeq = 0;
function nextEntityId(prefix: string): string {
  entitySeq += 1;
  return `${prefix}-${entitySeq}`;
}

export function createEmptyEmployee(): SalarySheetData["employees"][number] {
  return {
    id: nextEntityId("emp"),
    title: "",
    name: "",
    baseSalary: 5000,
    shareRatio: 0,
    tier1Rate: 0.1,
    tier2Rate: 0.11,
    tier3Rate: 0.12,
    plantingCount: 0,
    plantingBonusPerUnit: 50,
    leaveDays: 0,
    housingFund: 0,
    bonusMode: "tiered",
  };
}

export const BONUS_MODE_OPTIONS = [
  { value: "tiered", label: "阶梯奖金" },
  { value: "chen_pool", label: "陈美珍池" },
  { value: "lu_pool", label: "卢彤池" },
  { value: "xu_pool", label: "许桦婧池" },
] as const;
