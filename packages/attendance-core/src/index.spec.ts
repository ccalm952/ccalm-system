import { describe, expect, it } from "vitest"

import {
  buildEditWindowContext,
  isWithinAttendanceEditWindow,
  leaveDaysForShift,
  resolveShiftForDay,
} from "./index"

describe("schedule-inference", () => {
  const today = "2026-06-26"

  it("假期天数", () => {
    expect(leaveDaysForShift("full_rest")).toBe(1)
    expect(leaveDaysForShift("morning_rest")).toBe(0.5)
    expect(leaveDaysForShift(null)).toBe(0)
  })

  it("仅返回手动登记休息", () => {
    expect(resolveShiftForDay("2026-06-20", null, [], today)).toBeNull()
    expect(
      resolveShiftForDay("2026-06-20", null, [{ type: "morning_in" }], today)
    ).toBeNull()
    expect(resolveShiftForDay(today, null, [], today)).toBeNull()
    expect(resolveShiftForDay(today, "morning_rest", [], today)).toBe(
      "morning_rest"
    )
    expect(resolveShiftForDay("2026-06-20", "afternoon_rest", [], today)).toBe(
      "afternoon_rest"
    )
  })
})

describe("edit-window", () => {
  const ctx = buildEditWindowContext("2026-06-26")

  it("允许本月与上月", () => {
    expect(isWithinAttendanceEditWindow("2026-06-15", ctx)).toBe(true)
    expect(isWithinAttendanceEditWindow("2026-05-31", ctx)).toBe(true)
  })

  it("拒绝未来与更早月份", () => {
    expect(isWithinAttendanceEditWindow("2026-06-27", ctx)).toBe(false)
    expect(isWithinAttendanceEditWindow("2026-04-30", ctx)).toBe(false)
  })
})
