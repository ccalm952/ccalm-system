export type ScheduleShiftType = "full_rest" | "morning_rest" | "afternoon_rest"

export type DayPunchRecord = { type: string }

export function leaveDaysForShift(
  type: ScheduleShiftType | null | undefined
): number {
  if (!type) return 0
  if (type === "full_rest") return 1
  return 0.5
}

function dayRecordMap(records: DayPunchRecord[]): Map<string, boolean> {
  const map = new Map<string, boolean>()
  for (const r of records) {
    map.set(r.type, true)
  }
  return map
}

/** 根据打卡记录推断排班（不含登记休息、不含「当天」特殊规则）。 */
export function inferShiftFromPunches(
  records: DayPunchRecord[]
): ScheduleShiftType | null {
  const map = dayRecordMap(records)
  const hasMorningIn = map.has("morning_in")
  const hasAfternoonIn = map.has("afternoon_in")
  const hasMorningHalf = hasMorningIn || map.has("morning_out")
  const hasAfternoonHalf = hasAfternoonIn || map.has("afternoon_out")
  const hasAny = hasMorningHalf || hasAfternoonHalf

  if (!hasAny) return null
  if (hasMorningIn && hasAfternoonIn) return null
  if (hasMorningIn && !hasAfternoonIn) return "afternoon_rest"
  if (!hasMorningIn && hasAfternoonIn) return "morning_rest"
  if (hasMorningHalf && hasAfternoonHalf) return null
  if (hasMorningHalf && !hasAfternoonHalf) return "afternoon_rest"
  if (!hasMorningHalf && hasAfternoonHalf) return "morning_rest"
  return null
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
