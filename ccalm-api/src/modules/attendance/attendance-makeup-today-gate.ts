import {
  canMakeupTodaySlot,
  passesMakeupTodayGate as passesMakeupTodayGateCore,
  type MakeupSlotType,
  type MakeupTodayGate,
} from "./makeup-today-gate"

import { attendanceDayjs, attendanceTodayStart } from "./attendance-dayjs"

export type { MakeupTodayGate, MakeupSlotType } from "./makeup-today-gate"

function wallClockMinutes(d: Date): number {
  return attendanceDayjs(d).hour() * 60 + attendanceDayjs(d).minute()
}

export function isAttendanceDateToday(dateStr: string): boolean {
  return (
    attendanceDayjs(dateStr, "YYYY-MM-DD").format("YYYY-MM-DD") ===
    attendanceTodayStart().format("YYYY-MM-DD")
  )
}

export function canMakeupTodaySlotForDate(
  dateStr: string,
  type: MakeupSlotType,
  gate: MakeupTodayGate,
  at: Date = new Date()
): boolean {
  return canMakeupTodaySlot(
    isAttendanceDateToday(dateStr),
    wallClockMinutes(at),
    type,
    gate
  )
}

export function passesMakeupTodayGate(
  dateStr: string,
  type: MakeupSlotType,
  gate: MakeupTodayGate | undefined,
  at: Date = new Date()
): boolean {
  return passesMakeupTodayGateCore(
    isAttendanceDateToday(dateStr),
    wallClockMinutes(at),
    type,
    gate
  )
}
