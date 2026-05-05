import dayjs from "dayjs";

import type { AttendanceShiftFullConfig } from "./types";

export const DEFAULT_SHIFT: AttendanceShiftFullConfig = {
  morning: { label: "上午班", rangeStart: "08:30", rangeEnd: "12:00" },
  afternoon: { label: "下午班", rangeStart: "14:30", rangeEnd: "18:00" },
  morningInWindowStart: "08:30",
  morningInWindowEnd: "12:00",
  morningOutWindowStart: "12:00",
  morningOutWindowEnd: "14:30",
  afternoonInWindowStart: "14:30",
  afternoonInWindowEnd: "18:00",
  afternoonOutWindowStart: "18:00",
  afternoonOutWindowEnd: "23:59",
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

export function ymd(d: Date): string {
  return dayjs(d).format("YYYY-MM-DD");
}

export function hmFromIso(iso: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) return "--:--";
  return d.format("HH:mm");
}
