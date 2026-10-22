export type EditWindowContext = {
  todayYmd: string;
  currentMonth: string;
  previousMonth: string;
};

let editStartMonth = "";

/** 以最早打卡记录所在月为下限；为空时保持原来的本月/上月限制。 */
export function setAttendanceEditStart(month: string | null | undefined) {
  editStartMonth = /^\d{4}-\d{2}$/.test(month || "") ? String(month) : "";
}

/** 与考勤统计「本月 / 上个月」一致，允许编辑最早记录月至今天。 */
export function isWithinAttendanceEditWindow(
  dateStr: string,
  ctx: EditWindowContext,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  if (dateStr > ctx.todayYmd) return false;
  const month = dateStr.slice(0, 7);
  if (editStartMonth) {
    return month >= editStartMonth && month <= ctx.currentMonth;
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
