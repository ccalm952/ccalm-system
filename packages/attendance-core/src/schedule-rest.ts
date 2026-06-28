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

/** 某半天有任意的上/下班卡即视为该半天已出勤，不再计休息。 */
export function effectiveLeaveDaysForDay(
  declared: ScheduleShiftType | null | undefined,
  hasMorningPunch: boolean,
  hasAfternoonPunch: boolean
): number {
  let days = 0
  if (isMorningScheduleRest(declared) && !hasMorningPunch) days += 0.5
  if (isAfternoonScheduleRest(declared) && !hasAfternoonPunch) days += 0.5
  return days
}

/** 去掉已有打卡的半天后，剩余的有效休息登记类型。 */
export function effectiveShiftForDay(
  declared: ScheduleShiftType | null | undefined,
  hasMorningPunch: boolean,
  hasAfternoonPunch: boolean
): ScheduleShiftType | null {
  if (!declared) return null
  const morning = isMorningScheduleRest(declared) && !hasMorningPunch
  const afternoon = isAfternoonScheduleRest(declared) && !hasAfternoonPunch
  if (morning && afternoon) return "full_rest"
  if (morning) return "morning_rest"
  if (afternoon) return "afternoon_rest"
  return null
}
