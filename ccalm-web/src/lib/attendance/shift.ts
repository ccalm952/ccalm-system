import dayjs from "dayjs";

import type { AttendanceShiftFullConfig } from "./types";

export const DEFAULT_SHIFT: AttendanceShiftFullConfig = {
  morning: { label: "上午", rangeStart: "08:30", rangeEnd: "12:00" },
  afternoon: { label: "下午", rangeStart: "14:30", rangeEnd: "18:00" },
  morningInWindowStart: "08:25",
  morningInWindowEnd: "09:00",
  morningOutWindowStart: "11:00",
  morningOutWindowEnd: "14:20",
  afternoonInWindowStart: "14:25",
  afternoonInWindowEnd: "15:00",
  afternoonOutWindowStart: "17:00",
  afternoonOutWindowEnd: "20:20",
  overtimeMorningNormalEnd: "12:00",
  overtimeAfternoonNormalEnd: "18:00",
};

const HHMM = /^\d{1,2}:\d{2}$/;

export function isValidHHMM(s: string): boolean {
  return HHMM.test(s.trim());
}

export function minutesFromMidnight(hhmm: string): number {
  const [h, m] = hhmm.trim().split(":");
  const hh = Number(h);
  const mm = Number(m);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN;
  return hh * 60 + mm;
}

function wallClockMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function isWallClockAtOrAfter(d: Date, hhmm: string): boolean {
  const target = minutesFromMidnight(hhmm);
  if (!Number.isFinite(target)) return false;
  return wallClockMinutes(d) >= target;
}

export function isWallClockAtOrBefore(d: Date, hhmm: string): boolean {
  const target = minutesFromMidnight(hhmm);
  if (!Number.isFinite(target)) return false;
  return wallClockMinutes(d) <= target;
}

/** 严格晚于 HH:mm（分钟粒度），用于「打卡窗口结束后」才可补卡。 */
export function isWallClockAfter(d: Date, hhmm: string): boolean {
  const target = minutesFromMidnight(hhmm);
  if (!Number.isFinite(target)) return false;
  return wallClockMinutes(d) > target;
}

export function isWallClockInInclusiveRange(d: Date, start: string, end: string): boolean {
  const a = minutesFromMidnight(start);
  const b = minutesFromMidnight(end);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const v = wallClockMinutes(d);
  return v >= a && v <= b;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `YYYY-MM` */
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function previousMonthKey(d: Date = new Date()): string {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() - 1);
  return monthKey(copy);
}

export type BackendShiftDto = {
  morningLabel: string;
  morningRangeStart: string;
  morningRangeEnd: string;
  afternoonLabel: string;
  afternoonRangeStart: string;
  afternoonRangeEnd: string;
  morningInWindowStart: string;
  morningInWindowEnd: string;
  morningOutWindowStart: string;
  morningOutWindowEnd: string;
  afternoonInWindowStart: string;
  afternoonInWindowEnd: string;
  afternoonOutWindowStart: string;
  afternoonOutWindowEnd: string;
  overtimeMorningNormalEnd: string;
  overtimeAfternoonNormalEnd: string;
};

export function shiftFromBackend(d: BackendShiftDto): AttendanceShiftFullConfig {
  return {
    morning: {
      label: d.morningLabel,
      rangeStart: d.morningRangeStart,
      rangeEnd: d.morningRangeEnd,
    },
    afternoon: {
      label: d.afternoonLabel,
      rangeStart: d.afternoonRangeStart,
      rangeEnd: d.afternoonRangeEnd,
    },
    morningInWindowStart: d.morningInWindowStart,
    morningInWindowEnd: d.morningInWindowEnd,
    morningOutWindowStart: d.morningOutWindowStart,
    morningOutWindowEnd: d.morningOutWindowEnd,
    afternoonInWindowStart: d.afternoonInWindowStart,
    afternoonInWindowEnd: d.afternoonInWindowEnd,
    afternoonOutWindowStart: d.afternoonOutWindowStart,
    afternoonOutWindowEnd: d.afternoonOutWindowEnd,
    overtimeMorningNormalEnd: d.overtimeMorningNormalEnd,
    overtimeAfternoonNormalEnd: d.overtimeAfternoonNormalEnd,
  };
}

export function ymd(d: Date): string {
  return dayjs(d).format("YYYY-MM-DD");
}

export function hmFromIso(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) return "--:--";
  return d.format("HH:mm");
}
