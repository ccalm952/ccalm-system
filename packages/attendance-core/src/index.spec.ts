import { describe, expect, it } from "vitest"

import {
  buildEditWindowContext,
  inferShiftFromPunches,
  isWithinAttendanceEditWindow,
  leaveDaysForShift,
  resolveShiftForDay,
} from "./index"

describe("schedule-inference", () => {
  const today = "2026-06-26"

  it("无打卡不推断休息", () => {
    expect(inferShiftFromPunches([])).toBeNull()
    expect(leaveDaysForShift("full_rest")).toBe(1)
    expect(leaveDaysForShift("morning_rest")).toBe(0.5)
    expect(leaveDaysForShift(null)).toBe(0)
  })

  it("双上班卡为正常上班", () => {
    expect(
      inferShiftFromPunches([{ type: "morning_in" }, { type: "afternoon_in" }])
    ).toBeNull()
  })

  it("仅有上午下班卡推断为下休", () => {
    expect(inferShiftFromPunches([{ type: "morning_out" }])).toBe(
      "afternoon_rest"
    )
  })

  it("登记休息优先于打卡推断", () => {
    expect(
      resolveShiftForDay(
        "2026-06-20",
        "morning_rest",
        [{ type: "morning_in" }, { type: "afternoon_in" }],
        today
      )
    ).toBe("morning_rest")
  })

  it("当天无登记不推断", () => {
    expect(resolveShiftForDay(today, null, [], today)).toBeNull()
    expect(resolveShiftForDay(today, "morning_rest", [], today)).toBe(
      "morning_rest"
    )
  })

  it("历史日无登记无打卡不推断休息", () => {
    expect(resolveShiftForDay("2026-06-01", null, [], today)).toBeNull()
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
