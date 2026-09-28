import { describe, expect, it } from "vitest"

import { leaveDaysForShift, type ScheduleShiftType } from "./schedule-inference"

describe("leaveDaysForShift", () => {
  it("整天休息记 1 天，半天休息记 0.5 天", () => {
    expect(leaveDaysForShift("full_rest")).toBe(1)
    expect(leaveDaysForShift("morning_rest")).toBe(0.5)
    expect(leaveDaysForShift("afternoon_rest")).toBe(0.5)
  })

  it("未排班（null/undefined）记 0 天", () => {
    expect(leaveDaysForShift(null)).toBe(0)
    expect(leaveDaysForShift(undefined)).toBe(0)
  })

  it("所有排班类型都有明确天数", () => {
    const all: ScheduleShiftType[] = [
      "full_rest",
      "morning_rest",
      "afternoon_rest",
    ]
    expect(all.map(leaveDaysForShift)).toEqual([1, 0.5, 0.5])
  })
})
