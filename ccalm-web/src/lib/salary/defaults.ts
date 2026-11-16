import dayjs from "dayjs";

import {
  round2,
  socialInsuredCount,
  medicalInsuredCount,
  insuranceWithAutoHeadcounts,
  syncAutoInsuranceHeadcounts,
} from "./calc";
import type {
  SalaryCostItems,
  SalaryMaterialLine,
  SalaryOtherInsured,
  SalarySheetData,
} from "./types";

let employeeId = 0;
function emp(
  partial: Partial<Omit<SalarySheetData["employees"][number], "id">> &
    Pick<SalarySheetData["employees"][number], "title" | "name" | "bonusMode">,
): SalarySheetData["employees"][number] {
  employeeId += 1;
  return {
    id: `emp-${employeeId}`,
    baseSalary: 5000,
    shareRatio: 0,
    plantingCount: 0,
    leaveDays: 0,
    housingFund: 0,
    deductionRate: 0.2,
    paySocialMedical: true,
    ...partial,
  };
}

/** 根据 YYYY-MM（如 2026-06 / 标签 2606）返回当月自然日天数 */
export function calendarDaysForMonth(month: string): number {
  return dayjs(`${month}-01`).daysInMonth();
}

export function applyMonthCalendar(
  sheet: SalarySheetData,
  month: string,
): SalarySheetData {
  return {
    ...sheet,
    summary: {
      ...sheet.summary,
      daysInMonth: calendarDaysForMonth(month),
    },
  };
}

/** 有自定义模板则按其生成该月表，否则用内置默认模板；材料明细始终为空 */
export function resolveDefaultSalarySheet(
  month: string,
  template: SalarySheetData | null | undefined,
): SalarySheetData {
  const sheet = template
    ? normalizeSalarySheet(template, month)
    : createDefaultSalarySheet(month);
  return syncAutoInsuranceHeadcounts({
    ...clearMaterialLines(sheet),
    insuranceHeadcountAuto: true,
  });
}

/** 设为默认时去掉材料明细，避免带到新月 */
export function clearMaterialLines(sheet: SalarySheetData): SalarySheetData {
  return {
    ...sheet,
    materialLines: [],
    costItems: { ...sheet.costItems, materials: 0 },
  };
}

function createDefaultSalarySheet(month: string): SalarySheetData {
  employeeId = 0;
  const daysInMonth = calendarDaysForMonth(month);

  return syncAutoInsuranceHeadcounts({
    summary: {
      totalIncome: 0,
      daysInMonth,
      workingDays: 25,
    },
    leaveQuotas: { chen: 0, lu: 0, xu: 0 },
    employees: [
      emp({
        title: "执业医师",
        name: "胡芊芊",
        baseSalary: 12000,
        shareRatio: 0.28,
        plantingCount: 0,
        leaveDays: 0,
        housingFund: 700,
        bonusMode: "tiered",
      }),
      emp({
        title: "执业医师",
        name: "宁福月",
        baseSalary: 12000,
        shareRatio: 0.28,
        plantingCount: 0,
        leaveDays: 0,
        housingFund: 700,
        bonusMode: "tiered",
      }),
      emp({
        title: "执业医师",
        name: "骆群鸿",
        baseSalary: 12000,
        shareRatio: 0.28,
        plantingCount: 0,
        leaveDays: 0,
        housingFund: 700,
        bonusMode: "tiered",
      }),
      emp({
        title: "助理医师",
        name: "吴介尘",
        baseSalary: 8000,
        shareRatio: 0.01,
        plantingCount: 0,
        leaveDays: 0,
        housingFund: 0,
        bonusMode: "tiered",
      }),
      emp({
        title: "助理医师",
        name: "吴彤",
        baseSalary: 5500,
        shareRatio: 0.01,
        plantingCount: 0,
        leaveDays: 0,
        housingFund: 0,
        bonusMode: "tiered",
      }),
      emp({
        title: "助理医师",
        name: "余煌",
        baseSalary: 5500,
        shareRatio: 0.01,
        plantingCount: 0,
        leaveDays: 0,
        housingFund: 0,
        bonusMode: "tiered",
      }),
      emp({
        title: "护士",
        name: "陈美珍",
        baseSalary: 4700,
        shareRatio: 0,
        plantingCount: 0,
        leaveDays: 0,
        housingFund: 300,
        bonusMode: "chen_pool",
      }),
      emp({
        title: "护士",
        name: "卢彤",
        baseSalary: 5500,
        shareRatio: 0,
        plantingCount: 0,
        leaveDays: 0,
        housingFund: 700,
        bonusMode: "lu_pool",
      }),
      emp({
        title: "护士",
        name: "许桦婧",
        baseSalary: 4500,
        shareRatio: 0,
        plantingCount: 0,
        leaveDays: 0,
        housingFund: 0,
        bonusMode: "xu_pool",
      }),
    ],
    insurance: {
      pensionBase: 4043,
      pensionEmployerRate: 0.16,
      pensionEmployerCount: 9,
      pensionPersonalRate: 0.08,
      pensionPersonalCount: 9,
      unemploymentBase: 4043,
      unemploymentEmployerRate: 0.005,
      unemploymentEmployerCount: 9,
      unemploymentPersonalRate: 0.005,
      unemploymentPersonalCount: 9,
      injuryBase: 4414,
      injuryEmployerRate: 0.002,
      injuryEmployerCount: 9,
      medicalBase: 4433,
      medicalEmployerRate: 0.075,
      medicalEmployerCount: 9,
      medicalPersonalRate: 0.02,
      medicalPersonalCount: 9,
      maternityBase: 4433,
      maternityEmployerRate: 0.005,
      maternityEmployerCount: 9,
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
    },
    materialLines: [],
    otherInsured: [],
    insuranceHeadcountAuto: true,
  });
}

function normalizeCostItems(data: {
  costItems?: Partial<SalaryCostItems>;
}): SalaryCostItems {
  const items = data.costItems;
  if (items && typeof items === "object") {
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
    };
  }
  return {
    utilities: 3000,
    rent: 7500,
    materials: 0,
    planting: 0,
    processing: 0,
  };
}

export function isSalarySheetData(data: unknown): data is SalarySheetData {
  if (!data || typeof data !== "object") return false;
  const sheet = data as SalarySheetData;
  return (
    sheet.summary != null &&
    Array.isArray(sheet.employees) &&
    sheet.leaveQuotas != null &&
    sheet.costItems != null
  );
}

function normalizeMaterialLines(
  raw: unknown,
  materialsTotal: number,
): SalaryMaterialLine[] {
  if (Array.isArray(raw)) {
    const lines: SalaryMaterialLine[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const row = item as Partial<SalaryMaterialLine>;
      const id =
        typeof row.id === "string" && row.id.trim() ? row.id.trim() : "";
      const name = typeof row.name === "string" ? row.name.trim() : "";
      const amount =
        typeof row.amount === "number" && Number.isFinite(row.amount)
          ? Math.max(0, row.amount)
          : NaN;
      if (!id || !name || !Number.isFinite(amount)) continue;
      lines.push({ id, name, amount });
    }
    return lines;
  }
  if (materialsTotal > 0) {
    return [{ id: nextEntityId("mat"), name: "材料", amount: materialsTotal }];
  }
  return [];
}

export function sumMaterialLines(lines: SalaryMaterialLine[]): number {
  return round2(lines.reduce((sum, line) => sum + line.amount, 0));
}

function normalizeEmployees(
  employees: SalarySheetData["employees"],
): SalarySheetData["employees"] {
  const ids = new Set<string>();
  return employees.map((row) => {
    const id = ids.has(row.id) ? nextEntityId("emp") : row.id;
    ids.add(id);
    const paySocialMedical = row.paySocialMedical !== false;
    const deductionOk =
      typeof row.deductionRate === "number" &&
      Number.isFinite(row.deductionRate);
    if (
      deductionOk &&
      id === row.id &&
      row.paySocialMedical === paySocialMedical
    ) {
      return row;
    }
    return {
      ...row,
      id,
      paySocialMedical,
      ...(deductionOk ? {} : { deductionRate: Number.NaN }),
    };
  });
}

function normalizeOtherInsured(raw: unknown): SalaryOtherInsured[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>();
  const rows: SalaryOtherInsured[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<SalaryOtherInsured>;
    let id = typeof row.id === "string" ? row.id.trim() : "";
    if (!id || ids.has(id)) id = nextEntityId("ins");
    ids.add(id);
    rows.push({
      id,
      name: typeof row.name === "string" ? row.name : "",
      note: typeof row.note === "string" ? row.note : "",
      paySocial: row.paySocial !== false,
      payMedical: row.payMedical !== false,
    });
  }
  return rows;
}

export function normalizeSalarySheet(
  data: unknown,
  month: string,
): SalarySheetData {
  if (!isSalarySheetData(data)) {
    return createDefaultSalarySheet(month);
  }

  const costItems = normalizeCostItems(data);
  const materialLines = normalizeMaterialLines(
    (data as { materialLines?: unknown }).materialLines,
    costItems.materials,
  );
  const materials = sumMaterialLines(materialLines);
  const employees = normalizeEmployees(data.employees);
  const otherInsured = normalizeOtherInsured(
    (data as { otherInsured?: unknown }).otherInsured,
  );
  const insuranceHeadcountAuto =
    (data as { insuranceHeadcountAuto?: unknown }).insuranceHeadcountAuto ===
    true;
  const insurance =
    insuranceHeadcountAuto && data.insurance
      ? insuranceWithAutoHeadcounts(
          data.insurance,
          socialInsuredCount({ employees, otherInsured }),
          medicalInsuredCount({ employees, otherInsured }),
        )
      : data.insurance;

  return applyMonthCalendar(
    {
      summary: {
        ...data.summary,
        workingDays: data.summary.workingDays || 25,
      },
      leaveQuotas: data.leaveQuotas,
      employees,
      otherInsured,
      insurance,
      ...(insuranceHeadcountAuto ? { insuranceHeadcountAuto: true } : {}),
      housingFund: data.housingFund,
      costItems: { ...costItems, materials },
      materialLines,
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
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${entitySeq}`;
}

export function createEmptyEmployee(): SalarySheetData["employees"][number] {
  return {
    id: nextEntityId("emp"),
    title: "",
    name: "",
    baseSalary: 5000,
    shareRatio: 0,
    plantingCount: 0,
    leaveDays: 0,
    housingFund: 0,
    bonusMode: "tiered",
    deductionRate: 0.2,
    paySocialMedical: true,
  };
}

export function createEmptyOtherInsured(): SalaryOtherInsured {
  return {
    id: nextEntityId("ins"),
    name: "",
    note: "",
    paySocial: true,
    payMedical: true,
  };
}
