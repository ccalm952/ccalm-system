import type { OrthodonticsCategory } from "@prisma/client";
import dayjs, { type Dayjs } from "dayjs";

/** 与前端正畸页 OVERDUE_DAYS 一致：距上次就诊超过这么多天算待随访 */
export const ORTHODONTICS_FOLLOW_UP_DAYS = 30;

export function daysSinceVisit(
  lastVisitDate: string | null,
  today: Dayjs = dayjs(),
): number | null {
  if (!lastVisitDate) return null;
  const d = dayjs(lastVisitDate);
  if (!d.isValid()) return null;
  return today.startOf("day").diff(d.startOf("day"), "day");
}

export function isOrthodonticsFollowUpDue(
  category: OrthodonticsCategory,
  daysSinceLastVisit: number | null,
): boolean {
  return (
    category !== "completed" &&
    daysSinceLastVisit != null &&
    daysSinceLastVisit > ORTHODONTICS_FOLLOW_UP_DAYS
  );
}
