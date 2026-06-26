import { pad2, ymd } from "./shift";
import { attendanceTodayStart } from "./dayjs";

export function formatDayCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}-${pad2(Number(m) || 1)}`;
}

export function todayKey(): string {
  return ymd(attendanceTodayStart().toDate());
}
