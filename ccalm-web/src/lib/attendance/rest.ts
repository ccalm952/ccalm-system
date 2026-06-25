import dayjs from "dayjs";

import { isWithinMakeupWindow } from "./makeup";
import type { AttendancePunchDayRow, ScheduleRestType } from "./types";

export type RestHalf = "morning" | "afternoon";

export function isMorningScheduleRest(
  scheduleRest: ScheduleRestType | null | undefined,
): boolean {
  return scheduleRest === "full_rest" || scheduleRest === "morning_rest";
}

export function isAfternoonScheduleRest(
  scheduleRest: ScheduleRestType | null | undefined,
): boolean {
  return scheduleRest === "full_rest" || scheduleRest === "afternoon_rest";
}

export function isHalfScheduleRest(
  scheduleRest: ScheduleRestType | null | undefined,
  half: RestHalf,
): boolean {
  return half === "morning"
    ? isMorningScheduleRest(scheduleRest)
    : isAfternoonScheduleRest(scheduleRest);
}

export function halfHasPunch(row: AttendancePunchDayRow, half: RestHalf): boolean {
  if (half === "morning") return !!(row.morningIn || row.morningOut);
  return !!(row.afternoonIn || row.afternoonOut);
}

export function canDeclareRest(row: AttendancePunchDayRow, half: RestHalf): boolean {
  if (!isWithinMakeupWindow(row.date)) return false;
  if (halfHasPunch(row, half)) return false;
  if (isHalfScheduleRest(row.scheduleRest, half)) return false;
  return true;
}

export function willBecomeFullRest(
  scheduleRest: ScheduleRestType | null | undefined,
  half: RestHalf,
): boolean {
  if (half === "morning") return scheduleRest === "afternoon_rest";
  return scheduleRest === "morning_rest";
}

export function restHalfLabel(half: RestHalf): string {
  return half === "morning" ? "上午" : "下午";
}

export function formatRemainingLeave(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function leaveCostForDeclare(
  scheduleRest: ScheduleRestType | null | undefined,
  half: RestHalf,
): number {
  if (willBecomeFullRest(scheduleRest, half)) return 0.5;
  return 0.5;
}

export function restConfirmMessage(
  date: string,
  half: RestHalf,
  scheduleRest: ScheduleRestType | null | undefined,
  mode: "declare" | "clear",
): string {
  const label = restHalfLabel(half);
  const dateText = dayjs(date).format("M月D日");
  if (mode === "clear") {
    return `确认取消 ${dateText} ${label}休息登记？`;
  }
  if (willBecomeFullRest(scheduleRest, half)) {
    return `确认将 ${dateText} 登记为全天休息？将再扣除 0.5 天假期`;
  }
  return `确认将 ${dateText} ${label}登记为休息？将扣除 0.5 天假期`;
}
