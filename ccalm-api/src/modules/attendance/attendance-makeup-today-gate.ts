import dayjs from "dayjs"

import { minutesFromMidnight } from "./time"

export type MakeupTodayGate = {
  morningInWindowEnd: string
  afternoonInWindowEnd: string
}

type MakeupSlotType =
  | "morning_in"
  | "morning_out"
  | "afternoon_in"
  | "afternoon_out"

export function isAttendanceDateToday(dateStr: string): boolean {
  return (
    dayjs(dateStr, "YYYY-MM-DD", true).format("YYYY-MM-DD") ===
    dayjs().format("YYYY-MM-DD")
  )
}

function wallClockMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

function isWallClockAfter(d: Date, hhmm: string): boolean {
  const target = minutesFromMidnight(hhmm)
  if (!Number.isFinite(target)) return false
  return wallClockMinutes(d) > target
}

export function canMakeupTodaySlot(
  dateStr: string,
  type: MakeupSlotType,
  gate: MakeupTodayGate,
  at: Date = new Date()
): boolean {
  if (!isAttendanceDateToday(dateStr)) return true

  const endHhmm =
    type === "morning_in" || type === "morning_out"
      ? gate.morningInWindowEnd
      : gate.afternoonInWindowEnd
  return isWallClockAfter(at, endHhmm)
}

export function passesMakeupTodayGate(
  dateStr: string,
  type: MakeupSlotType,
  gate: MakeupTodayGate | undefined,
  at: Date = new Date()
): boolean {
  if (!isAttendanceDateToday(dateStr)) return true
  if (!gate) return false
  return canMakeupTodaySlot(dateStr, type, gate, at)
}
