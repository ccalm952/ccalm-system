import { minutesOf } from "./layout";

export type BoundsAppointment = {
  isPending?: boolean;
  startTime?: string;
  endTime?: string;
  visitDate?: string;
};

export type BoardBounds = { start: number; end: number };

/**
 * 看板时间范围：
 * - 默认从上班时间到下班时间；
 * - 有营业时间外的预约时，向两侧扩展到覆盖所有可见预约；
 * - 最少显示 1 小时。
 */
export function computeBoardBounds({
  appointments,
  workStart,
  workEnd,
  from,
  to,
}: {
  appointments: BoundsAppointment[];
  workStart: number;
  workEnd: number;
  from: string;
  to: string;
}): BoardBounds {
  let earliest = Infinity;
  let latest = -Infinity;
  for (const a of appointments) {
    if (a.isPending || !a.startTime) continue;
    if (a.visitDate && (a.visitDate < from || a.visitDate > to)) continue;
    const start = minutesOf(a.startTime);
    if (!Number.isFinite(start)) continue;
    const end = a.endTime ? minutesOf(a.endTime) : start + 30;
    earliest = Math.min(earliest, start);
    latest = Math.max(latest, Number.isFinite(end) ? end : start + 30);
  }

  const start = Math.min(workStart, Math.floor(earliest / 15) * 15);
  const end = Math.max(workEnd, Math.ceil(latest / 15) * 15);
  return { start, end: Math.max(end, start + 60) };
}
