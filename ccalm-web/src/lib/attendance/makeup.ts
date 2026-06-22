import dayjs from "dayjs";

import type { AttendanceMakeupRequest, AttendancePunchDayRow } from "./types";

export type MakeupOutType = "morning_out" | "afternoon_out";

export function isWithinMakeupWindow(dateStr: string): boolean {
  const d = dayjs(dateStr, "YYYY-MM-DD", true);
  if (!d.isValid()) return false;
  const today = dayjs().startOf("day");
  const earliest = today.subtract(29, "day");
  return !d.isBefore(earliest) && !d.isAfter(today);
}

export function adminMakeupSlotState(
  row: AttendancePunchDayRow,
  type: MakeupOutType,
): "apply" | null {
  if (!isWithinMakeupWindow(row.date)) return null;

  const hasIn = type === "morning_out" ? !!row.morningIn : !!row.afternoonIn;
  const hasOut = type === "morning_out" ? !!row.morningOut : !!row.afternoonOut;
  if (!hasIn || hasOut) return null;

  return "apply";
}

export function makeupSlotState(
  row: AttendancePunchDayRow,
  type: MakeupOutType,
  requests: AttendanceMakeupRequest[],
): "apply" | "pending" | null {
  if (!isWithinMakeupWindow(row.date)) return null;

  const hasIn = type === "morning_out" ? !!row.morningIn : !!row.afternoonIn;
  const hasOut = type === "morning_out" ? !!row.morningOut : !!row.afternoonOut;
  if (!hasIn || hasOut) return null;

  const pending = requests.some(
    (r) => r.date === row.date && r.type === type && r.status === "pending",
  );
  return pending ? "pending" : "apply";
}

export function formatMakeupTime(iso: string): string {
  const d = dayjs(iso);
  return d.isValid() ? d.format("HH:mm") : iso;
}
