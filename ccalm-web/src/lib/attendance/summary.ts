import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

import type {
  AttendanceMonthlySummary,
  AttendancePunchDayRow,
  AttendanceRecord,
  AttendanceShiftFullConfig,
} from "./types";
import { hmFromIso, minutesFromMidnight, pad2, ymd } from "./shift";
import { countMakeupButtonSlots } from "./makeup";
import type { AttendanceMakeupRequest } from "./types";

dayjs.extend(isSameOrAfter);

function monthRange(month: string): { startDate: string; rangeEnd: string } {
  const base = dayjs(`${month}-01`, "YYYY-MM-DD");
  const start = base.startOf("month");
  const end = base.isSame(dayjs(), "month") ? dayjs() : base.endOf("month");
  return { startDate: start.format("YYYY-MM-DD"), rangeEnd: end.format("YYYY-MM-DD") };
}

function fmtOvertime(minutes: number): string {
  if (minutes <= 0) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}分钟`;
  if (m <= 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
}

function emptyDay(date: string): AttendancePunchDayRow {
  return {
    date,
    morningIn: null,
    morningOut: null,
    afternoonIn: null,
    afternoonOut: null,
    overtimeMinutes: 0,
    overtimeStr: "-",
  };
}

function toDayKey(d: dayjs.Dayjs): string {
  return d.format("YYYY-MM-DD");
}

function isSameUserMonthRecord(r: AttendanceRecord, userId: string, month: string): boolean {
  if (r.userId !== userId) return false;
  const d = dayjs(r.punchTime);
  if (!d.isValid()) return false;
  return d.format("YYYY-MM") === month;
}

function sortByTimeAsc(a: AttendanceRecord, b: AttendanceRecord) {
  return dayjs(a.punchTime).valueOf() - dayjs(b.punchTime).valueOf();
}

/** 按半天统计：有上午/下午上班各 +0.5 出勤，缺相应上班 +0.5 休息；全天无打卡 +1 休息。 */
export function applyDayAttendanceRest(row: {
  morningIn: string | null;
  morningOut: string | null;
  afternoonIn: string | null;
  afternoonOut: string | null;
}): { attendanceDays: number; restDays: number } {
  const hasAny = !!(row.morningIn || row.morningOut || row.afternoonIn || row.afternoonOut);
  if (!hasAny) {
    return { attendanceDays: 0, restDays: 1 };
  }

  let attendanceDays = 0;
  let restDays = 0;

  if (row.morningIn) attendanceDays += 0.5;
  else restDays += 0.5;

  if (row.afternoonIn) attendanceDays += 0.5;
  else restDays += 0.5;

  return { attendanceDays, restDays };
}

export function formatDayCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function computeMonthlySummary(params: {
  records: AttendanceRecord[];
  userId: string;
  month: string; // YYYY-MM
  shift: AttendanceShiftFullConfig;
  makeupRequests?: AttendanceMakeupRequest[];
}): AttendanceMonthlySummary {
  const { records, userId, month, shift, makeupRequests = [] } = params;
  const { startDate, rangeEnd } = monthRange(month);

  const monthRecords = records
    .filter((r) => isSameUserMonthRecord(r, userId, month))
    .sort(sortByTimeAsc);
  const byDay = new Map<string, AttendanceRecord[]>();
  for (const r of monthRecords) {
    const d = dayjs(r.punchTime);
    const key = toDayKey(d);
    const arr = byDay.get(key) ?? [];
    arr.push(r);
    byDay.set(key, arr);
  }

  const start = dayjs(startDate, "YYYY-MM-DD");
  const end = dayjs(rangeEnd, "YYYY-MM-DD");

  const rows: AttendancePunchDayRow[] = [];
  let attendanceDays = 0;
  let restDays = 0;
  let missingSlots = 0;
  let overtimeMinutesTotal = 0;

  const normalMorningEnd = minutesFromMidnight(shift.overtimeMorningNormalEnd);
  const normalAfternoonEnd = minutesFromMidnight(shift.overtimeAfternoonNormalEnd);

  for (let d = end; d.isSameOrAfter(start, "day"); d = d.subtract(1, "day")) {
    const key = toDayKey(d);
    const dayRecords = (byDay.get(key) ?? []).slice().sort(sortByTimeAsc);
    const row = emptyDay(key);

    // 上班卡取最早一条；下班卡取最晚一条（下班可在窗口内更新）
    for (const r of dayRecords) {
      const hm = hmFromIso(r.punchTime);
      if (r.type === "morning_in" && !row.morningIn) row.morningIn = hm;
      if (r.type === "morning_out") row.morningOut = hm;
      if (r.type === "afternoon_in" && !row.afternoonIn) row.afternoonIn = hm;
      if (r.type === "afternoon_out") row.afternoonOut = hm;
    }

    const hasAny = !!(row.morningIn || row.morningOut || row.afternoonIn || row.afternoonOut);
    if (!hasAny) {
      restDays += 1;
      missingSlots += countMakeupButtonSlots(row, makeupRequests);
      rows.push(row);
      continue;
    }

    const dayStats = applyDayAttendanceRest(row);
    attendanceDays += dayStats.attendanceDays;
    restDays += dayStats.restDays;

    missingSlots += countMakeupButtonSlots(row, makeupRequests);

    // 加班：以“下班打卡 - 正常下班时间”为准（上午/下午分别计算，分钟累加）
    let overtime = 0;
    if (row.morningOut && Number.isFinite(normalMorningEnd)) {
      overtime += Math.max(0, minutesFromMidnight(row.morningOut) - normalMorningEnd);
    }
    if (row.afternoonOut && Number.isFinite(normalAfternoonEnd)) {
      overtime += Math.max(0, minutesFromMidnight(row.afternoonOut) - normalAfternoonEnd);
    }
    row.overtimeMinutes = overtime;
    row.overtimeStr = fmtOvertime(overtime);
    overtimeMinutesTotal += overtime;

    rows.push(row);
  }

  return {
    month,
    startDate,
    rangeEnd,
    attendanceDays,
    restDays,
    missingSlots,
    overtimeMinutes: overtimeMinutesTotal,
    overtimeStr: fmtOvertime(overtimeMinutesTotal),
    rows,
  };
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}-${pad2(Number(m) || 1)}`;
}

export function todayKey(): string {
  return ymd(new Date());
}
