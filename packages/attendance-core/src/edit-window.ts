export type EditWindowContext = {
  todayYmd: string
  currentMonth: string
  previousMonth: string
}

/** 与考勤统计「本月 / 上个月」一致：仅允许编辑本月与上个自然月内的日期。 */
export function isWithinAttendanceEditWindow(
  dateStr: string,
  ctx: EditWindowContext
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false
  if (dateStr > ctx.todayYmd) return false
  const month = dateStr.slice(0, 7)
  return month === ctx.currentMonth || month === ctx.previousMonth
}

export function buildEditWindowContext(todayYmd: string): EditWindowContext {
  const currentMonth = todayYmd.slice(0, 7)
  const [y, m] = currentMonth.split("-").map(Number)
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`
  return { todayYmd, currentMonth, previousMonth: prev }
}
