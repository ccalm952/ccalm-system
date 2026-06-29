import type { MakeupSlotType } from "./makeup-today-gate-core";

export type ScheduleRestType = "full_rest" | "morning_rest" | "afternoon_rest";

export type RestHalf = "morning" | "afternoon";

export type DayPunchRow = {
  date: string;
  morningIn: string | null;
  morningOut: string | null;
  afternoonIn: string | null;
  afternoonOut: string | null;
  declaredRest?: ScheduleRestType | null;
};

export function isMorningScheduleRest(
  declaredRest: ScheduleRestType | null | undefined,
): boolean {
  return declaredRest === "full_rest" || declaredRest === "morning_rest";
}

export function isAfternoonScheduleRest(
  declaredRest: ScheduleRestType | null | undefined,
): boolean {
  return declaredRest === "full_rest" || declaredRest === "afternoon_rest";
}

export function isHalfDeclaredRest(
  declaredRest: ScheduleRestType | null | undefined,
  half: RestHalf,
): boolean {
  return half === "morning"
    ? isMorningScheduleRest(declaredRest)
    : isAfternoonScheduleRest(declaredRest);
}

export function halfHasPunch(row: DayPunchRow, half: RestHalf): boolean {
  if (half === "morning") return !!(row.morningIn || row.morningOut);
  return !!(row.afternoonIn || row.afternoonOut);
}

export function isPunchBlockedByScheduleRest(
  type: MakeupSlotType,
  declaredRest: ScheduleRestType | null | undefined,
): boolean {
  if (
    (type === "morning_in" || type === "morning_out") &&
    isMorningScheduleRest(declaredRest)
  ) {
    return true;
  }
  if (
    (type === "afternoon_in" || type === "afternoon_out") &&
    isAfternoonScheduleRest(declaredRest)
  ) {
    return true;
  }
  return false;
}
