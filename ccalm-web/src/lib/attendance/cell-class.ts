import {
  attendanceMissingTextClass,
  attendanceMutedTextClass,
} from "./attendance-theme";
import { canDeclareRest, isHalfEffectivelyAtRest, type RestHalf } from "./rest";
import { isWallClockAfter, isWallClockAtOrAfter } from "./shift";
import { todayKey } from "./summary";
import type { AttendancePunchDayRow } from "./types";

export type AttendanceCellClassOptions = {
  shift?: {
    morningInWindowStart: string;
    afternoonInWindowStart: string;
    morningOutWindowEnd: string;
    afternoonOutWindowEnd: string;
  };
  at?: Date;
  todayYmd?: string;
};

/** 当天：上班窗口未到，或下班窗口未结束 → 下班格暂不标缺卡。 */
export function isOutMissingDeferredToday(
  row: AttendancePunchDayRow,
  half: RestHalf,
  options?: AttendanceCellClassOptions,
): boolean {
  const ymd = options?.todayYmd ?? todayKey();
  if (row.date !== ymd || !options?.shift) return false;

  const at = options.at ?? new Date();
  const { shift } = options;
  const inStart =
    half === "morning" ? shift.morningInWindowStart : shift.afternoonInWindowStart;
  const outEnd = half === "morning" ? shift.morningOutWindowEnd : shift.afternoonOutWindowEnd;

  if (!isWallClockAtOrAfter(at, inStart)) return true;
  if (!isWallClockAfter(at, outEnd)) return true;
  return false;
}

/** 上班格：有打卡时间用正文色；排班休息或已登记休息用浅色；缺卡用警示色。 */
export function attendanceInCellClass(
  row: AttendancePunchDayRow,
  half: RestHalf,
  time: string | null,
): string {
  if (time) return "";
  if (isHalfEffectivelyAtRest(row, half)) {
    return attendanceMutedTextClass;
  }
  if (canDeclareRest(row, half)) return "";
  return attendanceMissingTextClass;
}

/** 下班格：有打卡时间用正文色；排班/休息半天用浅色；当天窗口内暂不标缺卡；否则缺卡色。 */
export function attendanceOutCellClass(
  row: AttendancePunchDayRow,
  half: RestHalf,
  time: string | null,
  options?: AttendanceCellClassOptions,
): string {
  if (time) return "";
  if (isHalfEffectivelyAtRest(row, half)) {
    return attendanceMutedTextClass;
  }
  if (isOutMissingDeferredToday(row, half, options)) return "";
  return attendanceMissingTextClass;
}
