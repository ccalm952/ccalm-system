export type ChinaHolidayPeriod = {
  name: string;
  start: string;
  end: string;
};

export type ChinaHolidayYear = {
  year: number;
  offDayMap: Record<string, string>;
  periods: ChinaHolidayPeriod[];
  makeupDays: Array<{ date: string; name: string }>;
};

export function formatHolidayRange(start: string, end: string): string {
  const s = start.slice(5).replace("-", "月") + "日";
  if (start === end) return s;
  const e = end.slice(5).replace("-", "月") + "日";
  return `${s}—${e}`;
}
