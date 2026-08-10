import { type MakeupTodayGate } from "./makeup-today-gate-core";

import { attendanceDayjs, attendanceTodayStart } from "./dayjs";

export type { MakeupTodayGate } from "./makeup-today-gate-core";

export function makeupTodayGateFromShift(shift: MakeupTodayGate): MakeupTodayGate {
  return {
    morningInWindowEnd: shift.morningInWindowEnd,
    afternoonInWindowEnd: shift.afternoonInWindowEnd,
  };
}

export function isAttendanceDateToday(dateStr: string): boolean {
  return (
    attendanceDayjs(dateStr, "YYYY-MM-DD").format("YYYY-MM-DD") ===
    attendanceTodayStart().format("YYYY-MM-DD")
  );
}
