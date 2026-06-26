import {
  canMakeupTodaySlot as canMakeupTodaySlotCore,
  passesMakeupTodayGate as passesMakeupTodayGateCore,
  type MakeupSlotType,
  type MakeupTodayGate,
} from "@ccalm/attendance-core";

import { attendanceDayjs, attendanceTodayStart } from "./dayjs";
import type { AdminMakeupType } from "./makeup";

export type { MakeupTodayGate } from "@ccalm/attendance-core";

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

export function canMakeupTodaySlot(
  dateStr: string,
  type: AdminMakeupType,
  gate: MakeupTodayGate,
  at: Date = new Date(),
): boolean {
  return canMakeupTodaySlotCore(
    isAttendanceDateToday(dateStr),
    wallClockMinutes(at),
    type as MakeupSlotType,
    gate,
  );
}

export function passesMakeupTodayGate(
  dateStr: string,
  type: AdminMakeupType,
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
