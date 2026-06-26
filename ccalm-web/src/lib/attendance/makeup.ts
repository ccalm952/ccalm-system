import dayjs from "dayjs";

import { passesMakeupTodayGate, type MakeupTodayGate } from "./makeup-today-gate";
import { isHalfEffectivelyAtRest } from "./rest";
import type { AttendanceMakeupRequest, AttendancePunchDayRow, AttendancePunchType } from "./types";

export type { MakeupTodayGate } from "./makeup-today-gate";
export { makeupTodayGateFromShift } from "./makeup-today-gate";

export type MakeupInType = "morning_in" | "afternoon_in";
export type MakeupOutType = "morning_out" | "afternoon_out";
export type EmployeeMakeupType = MakeupInType | MakeupOutType;
export type AdminMakeupType = AttendancePunchType;

const IN_TYPE_BY_OUT: Record<MakeupOutType, "morning_in" | "afternoon_in"> = {
  morning_out: "morning_in",
  afternoon_out: "afternoon_in",
};

export function slotTime(row: AttendancePunchDayRow, type: AttendancePunchType): string | null {
  if (type === "morning_in") return row.morningIn;
  if (type === "morning_out") return row.morningOut;
  if (type === "afternoon_in") return row.afternoonIn;
  return row.afternoonOut;
}

export function isWithinMakeupWindow(dateStr: string): boolean {
  const d = dayjs(dateStr, "YYYY-MM-DD", true);
  if (!d.isValid()) return false;
  if (d.isAfter(dayjs().startOf("day"))) return false;

  const month = d.format("YYYY-MM");
  const today = dayjs();
  const currentMonth = today.format("YYYY-MM");
  const previousMonth = today.subtract(1, "month").format("YYYY-MM");
  return month === currentMonth || month === previousMonth;
}

export function adminMakeupSlotState(
  row: AttendancePunchDayRow,
  type: AdminMakeupType,
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | null {
  if (!isWithinMakeupWindow(row.date)) return null;
  if (!passesMakeupTodayGate(row.date, type, gate, at)) return null;

  if (type === "morning_in" || type === "afternoon_in") {
    return slotTime(row, type) ? null : "apply";
  }

  const inType = IN_TYPE_BY_OUT[type];
  if (!slotTime(row, inType) || slotTime(row, type)) return null;
  return "apply";
}

export function adminMakeupSlotStateWithPending(
  row: AttendancePunchDayRow,
  type: AdminMakeupType,
  requests: AttendanceMakeupRequest[] = [],
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | "pending" | null {
  const base = adminMakeupSlotState(row, type, gate, at);
  if (!base) return null;
  const pending = requests.some(
    (r) => r.date === row.date && r.type === type && r.status === "pending",
  );
  return pending ? "pending" : "apply";
}

export function punchSlotState(
  row: AttendancePunchDayRow,
  type: AdminMakeupType,
  requests: AttendanceMakeupRequest[] = [],
  adminDirect = false,
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | "pending" | null {
  if (adminDirect) {
    return adminMakeupSlotStateWithPending(row, type, requests, gate, at);
  }
  if (type === "morning_in" || type === "afternoon_in") {
    return makeupInSlotState(row, type, requests, gate, at);
  }
  return makeupSlotState(row, type, requests, gate, at);
}

export function makeupSlotState(
  row: AttendancePunchDayRow,
  type: MakeupOutType,
  requests: AttendanceMakeupRequest[],
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | "pending" | null {
  if (!isWithinMakeupWindow(row.date)) return null;
  if (!passesMakeupTodayGate(row.date, type, gate, at)) return null;

  if (type === "morning_out" && isHalfEffectivelyAtRest(row, "morning")) return null;
  if (type === "afternoon_out" && isHalfEffectivelyAtRest(row, "afternoon")) return null;

  const inType = IN_TYPE_BY_OUT[type];
  if (!slotTime(row, inType) || slotTime(row, type)) return null;

  const pending = requests.some(
    (r) => r.date === row.date && r.type === type && r.status === "pending",
  );
  return pending ? "pending" : "apply";
}

export function makeupInSlotState(
  row: AttendancePunchDayRow,
  type: MakeupInType,
  requests: AttendanceMakeupRequest[],
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | "pending" | null {
  if (!isWithinMakeupWindow(row.date)) return null;
  if (!passesMakeupTodayGate(row.date, type, gate, at)) return null;

  if (type === "morning_in" && isHalfEffectivelyAtRest(row, "morning")) return null;
  if (type === "afternoon_in" && isHalfEffectivelyAtRest(row, "afternoon")) return null;

  if (slotTime(row, type)) return null;

  const pending = requests.some(
    (r) => r.date === row.date && r.type === type && r.status === "pending",
  );
  return pending ? "pending" : "apply";
}

export function inTypeForHalf(half: "morning" | "afternoon"): MakeupInType {
  return half === "morning" ? "morning_in" : "afternoon_in";
}

export function formatMakeupTime(iso: string): string {
  const d = dayjs(iso);
  return d.isValid() ? d.format("HH:mm") : iso;
}

/** 与打卡页一致：每个可点击的「补/补卡」按钮计 1 次缺卡（审批中不计）。 */
export function countMakeupButtonSlots(
  row: AttendancePunchDayRow,
  requests: AttendanceMakeupRequest[] = [],
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): number {
  let count = 0;
  if (makeupInSlotState(row, "morning_in", requests, gate, at) === "apply") count += 1;
  if (makeupInSlotState(row, "afternoon_in", requests, gate, at) === "apply") count += 1;
  if (makeupSlotState(row, "morning_out", requests, gate, at) === "apply") count += 1;
  if (makeupSlotState(row, "afternoon_out", requests, gate, at) === "apply") count += 1;
  return count;
}
