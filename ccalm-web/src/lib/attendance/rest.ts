import dayjs from "dayjs";

import {
  isAfternoonScheduleRest,
  isMorningScheduleRest,
} from "@ccalm/attendance-core";

import { isWithinMakeupWindow } from "./makeup";
import type { AttendancePunchDayRow, ScheduleRestType } from "./types";

export type RestHalf = "morning" | "afternoon";

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

export function isHalfEffectivelyAtRest(row: AttendancePunchDayRow, half: RestHalf): boolean {
  return isHalfScheduleRest(row.scheduleRest, half) && !halfHasPunch(row, half);
}

export function canDeclareRest(row: AttendancePunchDayRow, half: RestHalf): boolean {
  if (!isWithinMakeupWindow(row.date)) return false;
  if (halfHasPunch(row, half)) return false;
  if (isHalfEffectivelyAtRest(row, half)) return false;
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
    return `确认将 ${dateText} 登记为全天休息？`;
  }
  return `确认将 ${dateText} ${label}登记为休息？`;
}
