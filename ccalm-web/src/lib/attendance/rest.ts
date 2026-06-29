import dayjs from "dayjs";

import { buildEditWindowContext, isWithinAttendanceEditWindow } from "./edit-window";
import { attendanceTodayStart } from "./dayjs";
import {
  halfHasPunch,
  isHalfDeclaredRest,
  type RestHalf,
} from "./schedule-rest";
import type { AttendancePunchDayRow, ScheduleRestType } from "./types";

export type { RestHalf };
export { halfHasPunch, isHalfDeclaredRest };

export function isWithinRestEditWindow(dateStr: string): boolean {
  const today = attendanceTodayStart();
  return isWithinAttendanceEditWindow(
    dateStr,
    buildEditWindowContext(today.format("YYYY-MM-DD")),
  );
}

export function canClearRest(row: AttendancePunchDayRow, half: RestHalf): boolean {
  return isHalfDeclaredRest(row.declaredRest, half);
}

export function canDeclareRest(row: AttendancePunchDayRow, half: RestHalf): boolean {
  if (!isWithinRestEditWindow(row.date)) return false;
  if (halfHasPunch(row, half)) return false;
  if (isHalfDeclaredRest(row.declaredRest, half)) return false;
  return true;
}

export function willBecomeFullRest(
  declaredRest: ScheduleRestType | null | undefined,
  half: RestHalf,
): boolean {
  if (half === "morning") return declaredRest === "afternoon_rest";
  return declaredRest === "morning_rest";
}

export function restHalfLabel(half: RestHalf): string {
  return half === "morning" ? "上午" : "下午";
}

export function restConfirmMessage(
  date: string,
  half: RestHalf,
  declaredRest: ScheduleRestType | null | undefined,
  mode: "declare" | "clear",
): string {
  const label = restHalfLabel(half);
  const dateText = dayjs(date).format("M月D日");
  if (mode === "clear") {
    return `确认取消 ${dateText} ${label}休息登记？`;
  }
  if (willBecomeFullRest(declaredRest, half)) {
    return `确认将 ${dateText} 登记为全天休息？`;
  }
  return `确认将 ${dateText} ${label}登记为休息？`;
}
