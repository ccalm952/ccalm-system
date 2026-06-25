import dayjs from "dayjs";

import type { AttendanceMakeupRequest, AttendancePunchDayRow, AttendancePunchType } from "./types";

export type MakeupOutType = "morning_out" | "afternoon_out";
export type AdminMakeupType = AttendancePunchType;

const IN_TYPE_BY_OUT: Record<MakeupOutType, "morning_in" | "afternoon_in"> = {
  morning_out: "morning_in",
  afternoon_out: "afternoon_in",
};

export function slotTime(
  row: AttendancePunchDayRow,
  type: AttendancePunchType,
): string | null {
  if (type === "morning_in") return row.morningIn;
  if (type === "morning_out") return row.morningOut;
  if (type === "afternoon_in") return row.afternoonIn;
  return row.afternoonOut;
}

export function isWithinMakeupWindow(dateStr: string): boolean {
  const d = dayjs(dateStr, "YYYY-MM-DD", true);
  if (!d.isValid()) return false;
  const today = dayjs().startOf("day");
  const earliest = today.subtract(29, "day");
  return !d.isBefore(earliest) && !d.isAfter(today);
}

export function adminMakeupSlotState(
  row: AttendancePunchDayRow,
  type: AdminMakeupType,
): "apply" | null {
  if (!isWithinMakeupWindow(row.date)) return null;

  if (type === "morning_in" || type === "afternoon_in") {
    return slotTime(row, type) ? null : "apply";
  }

  const inType = IN_TYPE_BY_OUT[type];
  if (!slotTime(row, inType) || slotTime(row, type)) return null;
  return "apply";
}

export function makeupSlotState(
  row: AttendancePunchDayRow,
  type: MakeupOutType,
  requests: AttendanceMakeupRequest[],
): "apply" | "pending" | null {
  if (!isWithinMakeupWindow(row.date)) return null;

  const inType = IN_TYPE_BY_OUT[type];
  if (!slotTime(row, inType) || slotTime(row, type)) return null;

  const pending = requests.some(
    (r) => r.date === row.date && r.type === type && r.status === "pending",
  );
  return pending ? "pending" : "apply";
}

export function formatMakeupTime(iso: string): string {
  const d = dayjs(iso);
  return d.isValid() ? d.format("HH:mm") : iso;
}

/** 有上班卡、无对应下班卡各计 1 次缺卡（与补卡按钮显示规则一致）。 */
export function countMissingOutSlots(row: {
  morningIn: string | null;
  morningOut: string | null;
  afternoonIn: string | null;
  afternoonOut: string | null;
}): number {
  let count = 0;
  if (row.morningIn && !row.morningOut) count += 1;
  if (row.afternoonIn && !row.afternoonOut) count += 1;
  return count;
}
