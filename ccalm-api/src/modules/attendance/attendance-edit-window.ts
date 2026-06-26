import dayjs from "dayjs"

/** 与考勤统计「本月 / 上个月」一致：仅允许编辑本月与上个自然月内的日期。 */
export function isWithinAttendanceEditWindow(dateStr: string): boolean {
  const d = dayjs(dateStr, "YYYY-MM-DD", true)
  if (!d.isValid()) return false

  const today = dayjs().startOf("day")
  if (d.isAfter(today)) return false

  const month = d.format("YYYY-MM")
  const currentMonth = today.format("YYYY-MM")
  const previousMonth = today.subtract(1, "month").format("YYYY-MM")
  return month === currentMonth || month === previousMonth
}
