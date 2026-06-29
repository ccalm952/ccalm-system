export type ScheduleShiftType = "full_rest" | "morning_rest" | "afternoon_rest"

export function leaveDaysForShift(
  type: ScheduleShiftType | null | undefined
): number {
  if (!type) return 0
  if (type === "full_rest") return 1
  return 0.5
}
