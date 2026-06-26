import {
  attendanceMissingTextClass,
  attendanceMutedTextClass,
} from "./attendance-theme";
import { canDeclareRest, isHalfEffectivelyAtRest, isHalfScheduleRest, type RestHalf } from "./rest";
import type { AttendancePunchDayRow } from "./types";

/** 上班格：有打卡时间用正文色；排班休息或已登记休息用浅色；缺卡用警示色。 */
export function attendanceInCellClass(
  row: AttendancePunchDayRow,
  half: RestHalf,
  time: string | null,
): string {
  if (time) return "";
  if (isHalfScheduleRest(row.scheduleRest, half) || isHalfEffectivelyAtRest(row, half)) {
    return attendanceMutedTextClass;
  }
  if (canDeclareRest(row, half)) return "";
  return attendanceMissingTextClass;
}

/** 下班格：有打卡时间用正文色；排班/休息半天用浅色；缺卡用警示色。 */
export function attendanceOutCellClass(
  row: AttendancePunchDayRow,
  half: RestHalf,
  time: string | null,
): string {
  if (time) return "";
  if (isHalfScheduleRest(row.scheduleRest, half) || isHalfEffectivelyAtRest(row, half)) {
    return attendanceMutedTextClass;
  }
  return attendanceMissingTextClass;
}
