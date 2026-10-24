export type EditWindowContext = {
  todayYmd: string;
  currentMonth: string;
  previousMonth: string;
};

/** 默认限本月/上月；传入最早记录月时，允许该月至今。 */
export function isWithinAttendanceEditWindow(
  dateStr: string,
  ctx: EditWindowContext,
  earliestMonth?: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  if (dateStr > ctx.todayYmd) return false;
  const month = dateStr.slice(0, 7);
  if (earliestMonth) {
    return month >= earliestMonth && month <= ctx.currentMonth;
  }
  return month === ctx.currentMonth || month === ctx.previousMonth;
}

export function buildEditWindowContext(todayYmd: string): EditWindowContext {
  const currentMonth = todayYmd.slice(0, 7);
  const [y, m] = currentMonth.split("-").map(Number);
  const prev =
    m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  return { todayYmd, currentMonth, previousMonth: prev };
}
