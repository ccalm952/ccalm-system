import dayjs from "dayjs";

import type { SalaryOperatingExpenses, SalaryOperatingLine, SalarySheetData } from "./types";

let lineId = 0;
function lineIdNext(prefix: string): string {
  lineId += 1;
  return `${prefix}-${lineId}`;
}

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
  lineId = 0;
  employeeId = 0;
  const daysInMonth = calendarDaysForMonth(month);

  return {
    summary: {
      totalIncome: 519250,
      daysInMonth,
      workingDays: 25,
    },
    leaveQuotas: { chen: 4, lu: 2, xu: 6 },
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
        title: "",
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
        title: "",
        name: "骆群鸿",
        baseSalary: 12000,
        shareRatio: 0.26,
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
        shareRatio: 0.02,
        tier1Rate: 0.07,
        tier2Rate: 0.08,
        tier3Rate: 0.09,
        plantingCount: 18,
        plantingBonusPerUnit: 500,
        leaveDays: 0,
        housingFund: 0,
        bonusMode: "tiered",
      }),
      emp({
        title: "",
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
        title: "",
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
        plantingCount: 7,
        plantingBonusPerUnit: 50,
        leaveDays: 0,
        housingFund: 300,
        bonusMode: "chen_pool",
      }),
      emp({
        title: "",
        name: "卢彤",
        baseSalary: 5500,
        shareRatio: 0,
        tier1Rate: 0,
        tier2Rate: 0,
        tier3Rate: 0,
        plantingCount: 8,
        plantingBonusPerUnit: 50,
        leaveDays: 0,
        housingFund: 700,
        bonusMode: "lu_pool",
      }),
      emp({
        title: "",
        name: "许桦婧",
        baseSalary: 4500,
        shareRatio: 0,
        tier1Rate: 0,
        tier2Rate: 0,
        tier3Rate: 0,
        plantingCount: 8,
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
    costs: [
      { id: lineIdNext("cost"), label: "奥齿泰", amount: 3475 },
      { id: lineIdNext("cost"), label: "陈克斌", amount: 0 },
      { id: lineIdNext("cost"), label: "材料", amount: 15000 },
      { id: lineIdNext("cost"), label: "种植", amount: 0 },
    ],
    processing: [
      { id: lineIdNext("proc"), label: "深圳", amount: 0 },
      { id: lineIdNext("proc"), label: "铭冠", amount: 0 },
      { id: lineIdNext("proc"), label: "致远", amount: 50000 },
    ],
    operating: [
      { id: lineIdNext("op"), label: "水电", amount: 3000 },
      { id: lineIdNext("op"), label: "租金", amount: 7500 },
    ],
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

export function isSalarySheetData(data: unknown): data is SalarySheetData {
  if (!data || typeof data !== "object") return false;
  const sheet = data as SalarySheetData;
  return (
    Array.isArray(sheet.costs) &&
    Array.isArray(sheet.processing) &&
    sheet.leaveQuotas != null &&
    (Array.isArray(sheet.operating) || isLegacyOperatingExpenses(sheet.operating))
  );
}

export function normalizeSalarySheet(data: unknown, month: string): SalarySheetData {
  if (isSalarySheetData(data)) {
    return applyMonthCalendar(
      {
        ...data,
        operating: normalizeOperatingExpenses(data.operating),
        summary: {
          ...data.summary,
          workingDays: data.summary.workingDays || 25,
        },
      },
      month,
    );
  }
  return createDefaultSalarySheet(month);
}

/** 仅去年 1 月至今年当前月 */
export function listSalaryMonths(now = dayjs()): string[] {
  const lastYear = now.year() - 1;
  const thisYear = now.year();
  const months: string[] = [];
  for (let m = 1; m <= 12; m += 1) {
    months.push(`${lastYear}-${String(m).padStart(2, "0")}`);
  }
  const endMonth = now.month() + 1;
  for (let m = 1; m <= endMonth; m += 1) {
    months.push(`${thisYear}-${String(m).padStart(2, "0")}`);
  }
  return months;
}

export function formatSalaryMonthTab(month: string): string {
  const [y, m] = month.split("-");
  return `${y.slice(2)}${m}`;
}

export function previousSalaryMonth(month: string): string | null {
  const prev = dayjs(`${month}-01`).subtract(1, "month");
  const allowed = new Set(listSalaryMonths());
  const key = prev.format("YYYY-MM");
  return allowed.has(key) ? key : null;
}

export function isSalaryMonthAllowed(month: string, now = dayjs()): boolean {
  return listSalaryMonths(now).includes(month);
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

export function createCostLine(label = ""): SalarySheetData["costs"][number] {
  return { id: nextEntityId("cost"), label, amount: 0 };
}

export function createProcessingLine(label = ""): SalarySheetData["processing"][number] {
  return { id: nextEntityId("proc"), label, amount: 0 };
}

export function createOperatingLine(label = ""): SalarySheetData["operating"][number] {
  return { id: nextEntityId("op"), label, amount: 0 };
}

export const BONUS_MODE_OPTIONS = [
  { value: "tiered", label: "阶梯奖金" },
  { value: "chen_pool", label: "陈美珍池" },
  { value: "lu_pool", label: "卢彤池" },
  { value: "xu_pool", label: "许桦婧池" },
] as const;
