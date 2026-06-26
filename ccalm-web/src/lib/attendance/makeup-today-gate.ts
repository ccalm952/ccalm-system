import dayjs from "dayjs";

import type { AdminMakeupType } from "./makeup";
import { isWallClockAfter } from "./shift";

export type MakeupTodayGate = {
  morningInWindowEnd: string;
  afternoonInWindowEnd: string;
};

export function makeupTodayGateFromShift(shift: MakeupTodayGate): MakeupTodayGate {
  return {
    morningInWindowEnd: shift.morningInWindowEnd,
    afternoonInWindowEnd: shift.afternoonInWindowEnd,
  };
}

export function isAttendanceDateToday(dateStr: string): boolean {
  return dayjs(dateStr, "YYYY-MM-DD", true).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");
}

export function canMakeupTodaySlot(
  dateStr: string,
  type: AdminMakeupType,
  gate: MakeupTodayGate,
  at: Date = new Date(),
): boolean {
  if (!isAttendanceDateToday(dateStr)) return true;

  const endHhmm =
    type === "morning_in" || type === "morning_out"
      ? gate.morningInWindowEnd
      : gate.afternoonInWindowEnd;
  return isWallClockAfter(at, endHhmm);
}

export function passesMakeupTodayGate(
  dateStr: string,
  type: AdminMakeupType,
  gate: MakeupTodayGate | undefined,
  at: Date = new Date(),
): boolean {
  if (!isAttendanceDateToday(dateStr)) return true;
  if (!gate) return false;
  return canMakeupTodaySlot(dateStr, type, gate, at);
}
