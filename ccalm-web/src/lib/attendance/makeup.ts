import dayjs from "dayjs";

import {
  adminMakeupSlotStateCore,
  makeupInSlotStateCore,
  makeupOutSlotStateCore,
} from "./makeup-slots";
import type { MakeupSlotType } from "./makeup-today-gate-core";
import { type MakeupTodayGate } from "./makeup-today-gate";
import type { AttendanceMakeupRequest, AttendancePunchDayRow, AttendancePunchType } from "./types";

export type { MakeupTodayGate } from "./makeup-today-gate";
export { makeupTodayGateFromShift } from "./makeup-today-gate";
export { isWithinRestEditWindow as isWithinMakeupWindow } from "./rest";

export type MakeupInType = "morning_in" | "afternoon_in";
export type MakeupOutType = "morning_out" | "afternoon_out";
export type EmployeeMakeupType = MakeupInType | MakeupOutType;
export type AdminMakeupType = AttendancePunchType;

function withPending(
  base: "apply" | null,
  row: AttendancePunchDayRow,
  type: MakeupSlotType,
  requests: AttendanceMakeupRequest[],
): "apply" | "pending" | null {
  if (!base) return null;
  const pending = requests.some(
    (r) => r.date === row.date && r.type === type && r.status === "pending",
  );
  return pending ? "pending" : "apply";
}

export function adminMakeupSlotStateWithPending(
  row: AttendancePunchDayRow,
  type: AdminMakeupType,
  requests: AttendanceMakeupRequest[] = [],
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | "pending" | null {
  const base = adminMakeupSlotStateCore(row, type, gate, at);
  return withPending(base, row, type, requests);
}

export function makeupSlotState(
  row: AttendancePunchDayRow,
  type: MakeupOutType,
  requests: AttendanceMakeupRequest[],
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | "pending" | null {
  const base = makeupOutSlotStateCore(row, type, gate, at);
  if (!base) return null;
  return withPending(base, row, type, requests);
}

export function makeupInSlotState(
  row: AttendancePunchDayRow,
  type: MakeupInType,
  requests: AttendanceMakeupRequest[],
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | "pending" | null {
  const base = makeupInSlotStateCore(row, type, gate, at);
  if (!base) return null;
  return withPending(base, row, type, requests);
}

export function inTypeForHalf(half: "morning" | "afternoon"): MakeupInType {
  return half === "morning" ? "morning_in" : "afternoon_in";
}

export function formatMakeupTime(iso: string): string {
  const d = dayjs(iso);
  return d.isValid() ? d.format("HH:mm") : iso;
}
