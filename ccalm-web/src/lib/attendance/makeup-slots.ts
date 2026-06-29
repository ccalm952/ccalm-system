import {
  buildEditWindowContext,
  isWithinAttendanceEditWindow,
  type EditWindowContext,
} from "./edit-window";
import {
  passesMakeupTodayGate,
  type MakeupSlotType,
  type MakeupTodayGate,
} from "./makeup-today-gate-core";
import {
  isPunchBlockedByScheduleRest,
  type DayPunchRow,
} from "./schedule-rest";

import { attendanceTodayStart } from "./dayjs";
import { isAttendanceDateToday } from "./makeup-today-gate";

type MakeupSlotsEnv = {
  editWindowContext: EditWindowContext;
  isToday: (dateStr: string) => boolean;
  wallMinutes: (at: Date) => number;
};

const IN_TYPE_BY_OUT: Record<"morning_out" | "afternoon_out", "morning_in" | "afternoon_in"> = {
  morning_out: "morning_in",
  afternoon_out: "afternoon_in",
};

function makeupSlotsEnv(): MakeupSlotsEnv {
  const todayYmd = attendanceTodayStart().format("YYYY-MM-DD");
  return {
    editWindowContext: buildEditWindowContext(todayYmd),
    isToday: isAttendanceDateToday,
    wallMinutes: (d) => d.getHours() * 60 + d.getMinutes(),
  };
}

function slotTime(row: DayPunchRow, type: MakeupSlotType): string | null {
  if (type === "morning_in") return row.morningIn;
  if (type === "morning_out") return row.morningOut;
  if (type === "afternoon_in") return row.afternoonIn;
  return row.afternoonOut;
}

function isWithinMakeupWindow(dateStr: string, env: MakeupSlotsEnv): boolean {
  return isWithinAttendanceEditWindow(dateStr, env.editWindowContext);
}

function passesGate(
  dateStr: string,
  type: MakeupSlotType,
  gate: MakeupTodayGate | undefined,
  at: Date,
  env: MakeupSlotsEnv,
): boolean {
  return passesMakeupTodayGate(
    env.isToday(dateStr),
    env.wallMinutes(at),
    type,
    gate,
  );
}

function employeeMakeupSlotState(
  row: DayPunchRow,
  type: MakeupSlotType,
  env: MakeupSlotsEnv,
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | null {
  if (!isWithinMakeupWindow(row.date, env)) return null;
  if (!passesGate(row.date, type, gate, at, env)) return null;
  if (isPunchBlockedByScheduleRest(type, row.declaredRest)) return null;
  if (type === "morning_in" || type === "afternoon_in") {
    if (slotTime(row, type)) return null;
    return "apply";
  }
  const inType = IN_TYPE_BY_OUT[type];
  if (!slotTime(row, inType) || slotTime(row, type)) return null;
  return "apply";
}

export function makeupInSlotStateCore(
  row: DayPunchRow,
  type: "morning_in" | "afternoon_in",
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | null {
  return employeeMakeupSlotState(row, type, makeupSlotsEnv(), gate, at);
}

export function makeupOutSlotStateCore(
  row: DayPunchRow,
  type: "morning_out" | "afternoon_out",
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | null {
  return employeeMakeupSlotState(row, type, makeupSlotsEnv(), gate, at);
}

export function adminMakeupSlotStateCore(
  row: DayPunchRow,
  type: MakeupSlotType,
  gate?: MakeupTodayGate,
  at: Date = new Date(),
): "apply" | null {
  return employeeMakeupSlotState(row, type, makeupSlotsEnv(), gate, at);
}
