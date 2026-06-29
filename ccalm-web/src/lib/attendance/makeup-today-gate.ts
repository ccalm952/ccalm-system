import {
  canMakeupTodaySlot,
  passesMakeupTodayGate as passesMakeupTodayGateCore,
  type MakeupSlotType,
  type MakeupTodayGate,
} from "./makeup-today-gate-core";

import { attendanceDayjs, attendanceTodayStart } from "./dayjs";
import type { AttendancePunchType } from "./types";

export type { MakeupTodayGate, MakeupSlotType } from "./makeup-today-gate-core";

export function makeupTodayGateFromShift(shift: MakeupTodayGate): MakeupTodayGate {
  return {
    morningInWindowEnd: shift.morningInWindowEnd,
    afternoonInWindowEnd: shift.afternoonInWindowEnd,
  };
}

function wallClockMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function isAttendanceDateToday(dateStr: string): boolean {
  return (
    attendanceDayjs(dateStr, "YYYY-MM-DD").format("YYYY-MM-DD") ===
    attendanceTodayStart().format("YYYY-MM-DD")
  );
}

export function canMakeupTodaySlotForDate(
  dateStr: string,
  type: AttendancePunchType,
  gate: MakeupTodayGate,
  at: Date = new Date(),
): boolean {
  return canMakeupTodaySlot(
    isAttendanceDateToday(dateStr),
    wallClockMinutes(at),
    type as MakeupSlotType,
    gate,
  );
}

export function passesMakeupTodayGate(
  dateStr: string,
  type: AttendancePunchType,
  gate: MakeupTodayGate | undefined,
  at: Date = new Date(),
): boolean {
  return passesMakeupTodayGateCore(
    isAttendanceDateToday(dateStr),
    wallClockMinutes(at),
    type as MakeupSlotType,
    gate,
  );
}
