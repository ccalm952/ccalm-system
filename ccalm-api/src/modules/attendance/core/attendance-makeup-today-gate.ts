import { attendanceDayjs, attendanceTodayStart } from "./attendance-dayjs"

export type { MakeupTodayGate } from "./makeup-today-gate"

export function isAttendanceDateToday(dateStr: string): boolean {
  return (
    attendanceDayjs(dateStr, "YYYY-MM-DD").format("YYYY-MM-DD") ===
    attendanceTodayStart().format("YYYY-MM-DD")
  )
}
