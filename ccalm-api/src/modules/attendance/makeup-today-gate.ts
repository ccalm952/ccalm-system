import { isWallClockAfterMinutes } from "./time"

export type MakeupTodayGate = {
  morningInWindowEnd: string
  afternoonInWindowEnd: string
}

export type MakeupSlotType =
  | "morning_in"
  | "morning_out"
  | "afternoon_in"
  | "afternoon_out"

export function canMakeupTodaySlot(
  isToday: boolean,
  wallMinutes: number,
  type: MakeupSlotType,
  gate: MakeupTodayGate
): boolean {
  if (!isToday) return true

  const endHhmm =
    type === "morning_in" || type === "morning_out"
      ? gate.morningInWindowEnd
      : gate.afternoonInWindowEnd
  return isWallClockAfterMinutes(wallMinutes, endHhmm)
}

export function passesMakeupTodayGate(
  isToday: boolean,
  wallMinutes: number,
  type: MakeupSlotType,
  gate: MakeupTodayGate | undefined
): boolean {
  if (!isToday) return true
  if (!gate) return false
  return canMakeupTodaySlot(isToday, wallMinutes, type, gate)
}
