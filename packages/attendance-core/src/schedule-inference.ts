export type ScheduleShiftType = "full_rest" | "morning_rest" | "afternoon_rest"

export type DayPunchRecord = { type: string }

export function leaveDaysForShift(
  type: ScheduleShiftType | null | undefined
): number {
  if (!type) return 0
  if (type === "full_rest") return 1
  return 0.5
}

/** 仅使用考勤页手动登记的休息，不根据打卡记录推断。 */
export function resolveShiftForDay(
  _dateStr: string,
  declared: ScheduleShiftType | null | undefined,
  _dayRecords: DayPunchRecord[],
  _todayYmd: string
): ScheduleShiftType | null {
  return declared ?? null
}
