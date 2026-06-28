import type { MakeupSlotType } from "./makeup-today-gate"

export type ScheduleShiftType = "full_rest" | "morning_rest" | "afternoon_rest"

export function isMorningScheduleRest(
  scheduleRest: ScheduleShiftType | null | undefined
): boolean {
  return scheduleRest === "full_rest" || scheduleRest === "morning_rest"
}

export function isAfternoonScheduleRest(
  scheduleRest: ScheduleShiftType | null | undefined
): boolean {
  return scheduleRest === "full_rest" || scheduleRest === "afternoon_rest"
}

export function isPunchBlockedByScheduleRest(
  type: MakeupSlotType,
  scheduleRest: ScheduleShiftType | null | undefined
): boolean {
  if (
    (type === "morning_in" || type === "morning_out") &&
    isMorningScheduleRest(scheduleRest)
  ) {
    return true
  }
  if (
    (type === "afternoon_in" || type === "afternoon_out") &&
    isAfternoonScheduleRest(scheduleRest)
  ) {
    return true
  }
  return false
}
