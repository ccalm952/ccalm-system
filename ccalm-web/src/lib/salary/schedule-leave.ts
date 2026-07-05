import type { ScheduleMonthData } from "@/lib/attendance/schedule";
import { api } from "@/lib/api";

import { formatSalaryMonthTab } from "./defaults";
import type { SalaryLeaveQuotas } from "./types";

const SCHEDULE_LEAVE_EMPLOYEES: Record<keyof SalaryLeaveQuotas, string> = {
  chen: "陈美珍",
  lu: "卢彤",
  xu: "许桦婧",
};

/** 薪资月 M 引用排班表 M 月的请假天数 */
export function scheduleLeaveSourceMonth(salaryMonth: string): string | null {
  return salaryMonth;
}

export function scheduleLeaveSourceMonthLabel(salaryMonth: string): string {
  const source = scheduleLeaveSourceMonth(salaryMonth);
  return source ? formatSalaryMonthTab(source) : "";
}

export function formatScheduleLeaveDays(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return String(n);
}

function leaveDaysForUser(data: ScheduleMonthData, name: string): number {
  return data.users.find((u) => u.userName === name)?.monthLeave ?? 0;
}

export async function fetchLeaveQuotasFromSchedule(
  salaryMonth: string,
): Promise<SalaryLeaveQuotas> {
  const scheduleMonth = scheduleLeaveSourceMonth(salaryMonth);
  if (!scheduleMonth) {
    return { chen: 0, lu: 0, xu: 0 };
  }

  try {
    const data = await api<ScheduleMonthData>(
      "GET",
      `/attendance/schedule?month=${encodeURIComponent(scheduleMonth)}`,
    );
    return {
      chen: leaveDaysForUser(data, SCHEDULE_LEAVE_EMPLOYEES.chen),
      lu: leaveDaysForUser(data, SCHEDULE_LEAVE_EMPLOYEES.lu),
      xu: leaveDaysForUser(data, SCHEDULE_LEAVE_EMPLOYEES.xu),
    };
  } catch {
    return { chen: 0, lu: 0, xu: 0 };
  }
}
