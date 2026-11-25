import { api } from "@/lib/api";

import type { SalarySheetData } from "./types";

type StaffStatRow = { name: string; count: number };

/** 从种植统计拉取当月配台人次（一人一行） */
export async function fetchPlantingCountsByName(
  month: string,
): Promise<Record<string, number>> {
  try {
    const rows = await api<StaffStatRow[]>(
      "GET",
      `/implant/stats/staff?month=${encodeURIComponent(month)}`,
    );
    const map: Record<string, number> = {};
    if (!Array.isArray(rows)) return map;
    for (const row of rows) {
      if (!row?.name) continue;
      map[row.name] = typeof row.count === "number" ? row.count : 0;
    }
    return map;
  } catch {
    return {};
  }
}

/** 把种植统计次数写入薪资表中同名员工的种植输入框；未出现在统计里的员工不动 */
export function applyPlantingCountsToSheet(
  sheet: SalarySheetData,
  countsByName: Record<string, number>,
): SalarySheetData {
  let changed = false;
  const employees = sheet.employees.map((emp) => {
    if (!Object.prototype.hasOwnProperty.call(countsByName, emp.name)) {
      return emp;
    }
    const plantingCount = countsByName[emp.name] ?? 0;
    if (emp.plantingCount === plantingCount) return emp;
    changed = true;
    return { ...emp, plantingCount };
  });
  return changed ? { ...sheet, employees } : sheet;
}
