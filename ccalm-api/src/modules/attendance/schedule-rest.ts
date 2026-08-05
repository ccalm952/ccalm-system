import type { MakeupSlotType } from "./makeup-today-gate"
import type { ScheduleShiftType } from "./schedule-inference"

export type DayPunchRow = {
  date: string
  morningIn: string | null
  morningOut: string | null
  afternoonIn: string | null
  afternoonOut: string | null
  declaredRest?: ScheduleShiftType | null
}

export function isMorningScheduleRest(
  declaredRest: ScheduleShiftType | null | undefined
): boolean {
  return declaredRest === "full_rest" || declaredRest === "morning_rest"
}

export function isAfternoonScheduleRest(
  declaredRest: ScheduleShiftType | null | undefined
): boolean {
  return declaredRest === "full_rest" || declaredRest === "afternoon_rest"
}

export function isPunchBlockedByScheduleRest(
  type: MakeupSlotType,
  declaredRest: ScheduleShiftType | null | undefined
): boolean {
  if (
    (type === "morning_in" || type === "morning_out") &&
    isMorningScheduleRest(declaredRest)
  ) {
    return true
  }
  if (
    (type === "afternoon_in" || type === "afternoon_out") &&
    isAfternoonScheduleRest(declaredRest)
  ) {
    return true
  }
  return false
}
