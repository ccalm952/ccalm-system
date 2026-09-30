function pad(n) {
  return n < 10 ? `0${n}` : String(n)
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

function previousMonthKey(d = new Date()) {
  const copy = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  return monthKey(copy)
}

function todayYmd(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dayOfMonth(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "")
  if (!m) return dateStr
  return String(Number(m[3]))
}

function formatClock(d = new Date()) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatDateLabel(d = new Date()) {
  const week = ["日", "一", "二", "三", "四", "五", "六"]
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${week[d.getDay()]}`
}

function formatHm(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "--:--"
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDayCount(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return "0"
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function minutesFromMidnight(hhmm) {
  const parts = String(hhmm || "").trim().split(":")
  const hh = Number(parts[0])
  const mm = Number(parts[1])
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN
  return hh * 60 + mm
}

function isWallClockInInclusiveRange(d, start, end) {
  const a = minutesFromMidnight(start)
  const b = minutesFromMidnight(end)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false
  const v = d.getHours() * 60 + d.getMinutes()
  return v >= a && v <= b
}

function isWallClockAfter(d, hhmm) {
  const target = minutesFromMidnight(hhmm)
  if (!Number.isFinite(target)) return false
  return d.getHours() * 60 + d.getMinutes() > target
}

function buildEditWindowContext(today = todayYmd()) {
  const currentMonth = today.slice(0, 7)
  return {
    todayYmd: today,
    currentMonth,
    previousMonth: previousMonthKey(new Date(`${today}T12:00:00`)),
  }
}

function isWithinEditWindow(dateStr, ctx = buildEditWindowContext()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return false
  if (dateStr > ctx.todayYmd) return false
  const month = dateStr.slice(0, 7)
  return month === ctx.currentMonth || month === ctx.previousMonth
}

module.exports = {
  pad,
  monthKey,
  previousMonthKey,
  todayYmd,
  dayOfMonth,
  formatClock,
  formatDateLabel,
  formatHm,
  formatDayCount,
  minutesFromMidnight,
  isWallClockInInclusiveRange,
  isWallClockAfter,
  buildEditWindowContext,
  isWithinEditWindow,
}
