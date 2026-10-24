/**
 * 日期、月份、时间窗口与格式化工具（纯函数，不依赖页面状态）。
 */

function pad(n) {
  return n < 10 ? `0${n}` : String(n);
}

const pad2 = pad;

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function previousMonthKey(d = new Date()) {
  const copy = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return monthKey(copy);
}

function shiftMonthKey(month, delta) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || "");
  if (!match) return month;
  const shifted = new Date(Number(match[1]), Number(match[2]) - 1 + delta, 1);
  return monthKey(shifted);
}

function formatMonthTitle(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month || "");
  if (!match) return month;
  return `${match[1]}年${Number(match[2])}月`;
}

function todayYmd(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayOfMonth(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!m) return dateStr;
  return String(Number(m[3]));
}

function formatClock(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateShort(d = new Date()) {
  const week = ["日", "一", "二", "三", "四", "五", "六"];
  return `${d.getMonth() + 1}月${d.getDate()}日星期${week[d.getDay()]}`;
}

function formatHm(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatYmdHm(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${todayYmd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDayCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatOvertime(value) {
  const text = String(value || "").trim();
  const both = /^(\d+)小时(\d+)分钟$/.exec(text);
  if (both) return String(Number(both[1]) * 60 + Number(both[2]));
  const hours = /^(\d+)小时$/.exec(text);
  if (hours) return String(Number(hours[1]) * 60);
  const minutes = /^(\d+)分钟$/.exec(text);
  if (minutes) return minutes[1];
  return text;
}

/** 加班分钟按 6 分钟一档向下取整为小时，保留 1 位小数（72→1.2h，78→1.3h） */
function formatOvertimeHours(value) {
  const text = String(value || "").trim();
  if (text.length === 0 || text === "-") return "";
  if (text === "0" || text === "0分钟" || text === "0小时") return "0.0h";
  const minutes = Number(formatOvertime(text));
  if (!Number.isFinite(minutes)) return text;
  if (minutes <= 0) return "0.0h";
  const tenths = Math.floor(minutes / 6);
  return `${(tenths / 10).toFixed(1)}h`;
}

function minutesFromMidnight(hhmm) {
  const parts = String(hhmm || "")
    .trim()
    .split(":");
  const hh = Number(parts[0]);
  const mm = Number(parts[1]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN;
  return hh * 60 + mm;
}

function isWallClockInInclusiveRange(d, start, end) {
  const a = minutesFromMidnight(start);
  const b = minutesFromMidnight(end);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const v = d.getHours() * 60 + d.getMinutes();
  return v >= a && v <= b;
}

function isWallClockAfter(d, hhmm) {
  const target = minutesFromMidnight(hhmm);
  if (!Number.isFinite(target)) return false;
  return d.getHours() * 60 + d.getMinutes() > target;
}

function buildEditWindowContext(today = todayYmd()) {
  const currentMonth = today.slice(0, 7);
  return {
    todayYmd: today,
    currentMonth,
    previousMonth: previousMonthKey(new Date(`${today}T12:00:00`)),
  };
}

function isWithinEditWindow(
  dateStr,
  ctx = buildEditWindowContext(),
  startMonth,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return false;
  if (dateStr > ctx.todayYmd) return false;
  const month = dateStr.slice(0, 7);
  if (startMonth) {
    return month >= startMonth && month <= ctx.currentMonth;
  }
  return month === ctx.currentMonth || month === ctx.previousMonth;
}

module.exports = {
  pad2,
  monthKey,
  previousMonthKey,
  shiftMonthKey,
  formatMonthTitle,
  todayYmd,
  dayOfMonth,
  formatClock,
  formatDateShort,
  formatHm,
  formatYmdHm,
  formatDayCount,
  formatOvertimeHours,
  isWallClockInInclusiveRange,
  isWallClockAfter,
  buildEditWindowContext,
  isWithinEditWindow,
};
