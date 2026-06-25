import dayjs from "dayjs"

type ScheduleRest = "full_rest" | "morning_rest" | "afternoon_rest" | null

type DayRow = {
  date: string
  morningIn: string | null
  morningOut: string | null
  afternoonIn: string | null
  afternoonOut: string | null
  scheduleRest: ScheduleRest
}

type PendingMakeup = {
  date: string
  type: string
  status: string
}

function isWithinMakeupWindow(dateStr: string): boolean {
  const d = dayjs(dateStr, "YYYY-MM-DD", true)
  if (!d.isValid()) return false
  const today = dayjs().startOf("day")
  const earliest = today.subtract(29, "day")
  return !d.isBefore(earliest) && !d.isAfter(today)
}

function isMorningScheduleRest(scheduleRest: ScheduleRest): boolean {
  return scheduleRest === "full_rest" || scheduleRest === "morning_rest"
}

function isAfternoonScheduleRest(scheduleRest: ScheduleRest): boolean {
  return scheduleRest === "full_rest" || scheduleRest === "afternoon_rest"
}

function isMorningEffectivelyAtRest(row: DayRow): boolean {
  return (
    isMorningScheduleRest(row.scheduleRest) && !row.morningIn && !row.morningOut
  )
}

function isAfternoonEffectivelyAtRest(row: DayRow): boolean {
  return (
    isAfternoonScheduleRest(row.scheduleRest) &&
    !row.afternoonIn &&
    !row.afternoonOut
  )
}

function hasPending(
  row: DayRow,
  type: string,
  pending: PendingMakeup[]
): boolean {
  return pending.some(
    (r) => r.date === row.date && r.type === type && r.status === "pending"
  )
}

function makeupInSlotState(
  row: DayRow,
  type: "morning_in" | "afternoon_in",
  pending: PendingMakeup[]
): "apply" | null {
  if (!isWithinMakeupWindow(row.date)) return null
  if (type === "morning_in" && isMorningEffectivelyAtRest(row)) return null
  if (type === "afternoon_in" && isAfternoonEffectivelyAtRest(row)) return null
  if (type === "morning_in" ? row.morningIn : row.afternoonIn) return null
  if (hasPending(row, type, pending)) return null
  return "apply"
}

function makeupOutSlotState(
  row: DayRow,
  type: "morning_out" | "afternoon_out",
  pending: PendingMakeup[]
): "apply" | null {
  if (!isWithinMakeupWindow(row.date)) return null
  if (type === "morning_out" && isMorningEffectivelyAtRest(row)) return null
  if (type === "afternoon_out" && isAfternoonEffectivelyAtRest(row)) return null
  const inType = type === "morning_out" ? "morning_in" : "afternoon_in"
  const inTime = inType === "morning_in" ? row.morningIn : row.afternoonIn
  const outTime = type === "morning_out" ? row.morningOut : row.afternoonOut
  if (!inTime || outTime) return null
  if (hasPending(row, type, pending)) return null
  return "apply"
}

/** 与打卡页一致：每个可点击的「补/补卡」按钮计 1 次缺卡（审批中不计）。 */
export function countMakeupButtonSlots(
  row: DayRow,
  pending: PendingMakeup[] = []
): number {
  let count = 0
  if (makeupInSlotState(row, "morning_in", pending) === "apply") count += 1
  if (makeupInSlotState(row, "afternoon_in", pending) === "apply") count += 1
  if (makeupOutSlotState(row, "morning_out", pending) === "apply") count += 1
  if (makeupOutSlotState(row, "afternoon_out", pending) === "apply") count += 1
  return count
}

export function applyDayAttendanceRest(row: DayRow): {
  attendanceDays: number
  restDays: number
} {
  let attendanceDays = 0
  let restDays = 0

  if (row.morningIn) attendanceDays += 0.5
  else if (isMorningEffectivelyAtRest(row)) restDays += 0.5
  else restDays += 0.5

  if (row.afternoonIn) attendanceDays += 0.5
  else if (isAfternoonEffectivelyAtRest(row)) restDays += 0.5
  else restDays += 0.5

  return { attendanceDays, restDays }
}
