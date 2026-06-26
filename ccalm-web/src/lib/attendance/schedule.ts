import dayjs from "dayjs";

export type ScheduleShiftType = "full_rest" | "morning_rest" | "afternoon_rest";

export const SCHEDULE_SHIFT_LABEL: Record<ScheduleShiftType, string> = {
  full_rest: "全",
  morning_rest: "上",
  afternoon_rest: "下",
};

export { scheduleShiftCellClass as scheduleCellClass } from "./attendance-theme";

/** 排班表仅允许查看去年 1 月 ~ 今年 12 月 */
export function scheduleMonthRange(now = dayjs()) {
  const minMonth = now.subtract(1, "year").startOf("year").format("YYYY-MM");
  const maxMonth = now.endOf("year").format("YYYY-MM");
  return { minMonth, maxMonth };
}

export function clampScheduleMonth(month: string, now = dayjs()) {
  const { minMonth, maxMonth } = scheduleMonthRange(now);
  if (month < minMonth) return minMonth;
  if (month > maxMonth) return maxMonth;
  return month;
}

export type ScheduleMonthData = {
  month: string;
  monthAllowance: number;
  daysInMonth: number;
  dayHeaders: Array<{ day: number; weekday: string }>;
  users: Array<{
    userId: string;
    userName: string;
    days: Record<string, ScheduleShiftType | null>;
    fullCount: number;
    morningCount: number;
    afternoonCount: number;
    monthLeave: number;
    remainingLeave: number;
  }>;
};
