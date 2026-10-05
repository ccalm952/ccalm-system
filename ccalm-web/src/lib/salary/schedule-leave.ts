import type { ScheduleMonthData } from "@/lib/attendance/schedule";
import { api } from "@/lib/api";

import { formatSalaryMonthTab } from "./defaults";
import type { SalaryLeaveQuotas } from "./types";

const SCHEDULE_LEAVE_EMPLOYEES: Record<keyof SalaryLeaveQuotas, string> = {
  chen: "陈美珍",
  lu: "卢彤",
  xu: "许桦婧",
};

export function scheduleLeaveSourceMonthLabel(salaryMonth: string): string {
  return formatSalaryMonthTab(salaryMonth);
}

export function formatScheduleLeaveDays(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return String(n);
}

function leaveDaysForUser(data: ScheduleMonthData, name: string): number {
  return data.users.find((u) => u.userName === name)?.monthLeave ?? 0;
}

export type ScheduleLeaveSync = {
  quotas: SalaryLeaveQuotas;
  leaveDaysByName: Record<string, number>;
};

export async function fetchLeaveQuotasFromSchedule(
  salaryMonth: string,
): Promise<ScheduleLeaveSync> {
  try {
    const data = await api<ScheduleMonthData>(
      "GET",
      `/attendance/schedule?month=${encodeURIComponent(salaryMonth)}&includeOvertime=0`,
    );
    const leaveDaysByName: Record<string, number> = {};
    for (const user of data.users) {
      if (user.leaveOffsetDays == null) continue;
      leaveDaysByName[user.userName] = user.leaveOffsetDays;
    }
    return {
      quotas: {
        chen: leaveDaysForUser(data, SCHEDULE_LEAVE_EMPLOYEES.chen),
        lu: leaveDaysForUser(data, SCHEDULE_LEAVE_EMPLOYEES.lu),
        xu: leaveDaysForUser(data, SCHEDULE_LEAVE_EMPLOYEES.xu),
      },
      leaveDaysByName,
    };
  } catch {
    return { quotas: { chen: 0, lu: 0, xu: 0 }, leaveDaysByName: {} };
  }
}
