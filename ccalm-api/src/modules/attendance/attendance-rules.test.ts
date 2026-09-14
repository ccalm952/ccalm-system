import { describe, expect, it } from "vitest"

import { attendanceDayjs } from "./attendance-dayjs"
import { shouldAutoMakeupOut } from "./auto-makeup-out"
import {
  buildEditWindowContext,
  isWithinAttendanceEditWindow,
} from "./edit-window"
import { passesMakeupTodayGate } from "./makeup-today-gate"

describe("考勤编辑窗口", () => {
  const context = buildEditWindowContext("2026-01-15")

  it("跨年时允许本月和上月日期", () => {
    expect(context.previousMonth).toBe("2025-12")
    expect(isWithinAttendanceEditWindow("2025-12-01", context)).toBe(true)
    expect(isWithinAttendanceEditWindow("2026-01-15", context)).toBe(true)
  })

  it("拒绝更早月份、未来日期和非法格式", () => {
    expect(isWithinAttendanceEditWindow("2025-11-30", context)).toBe(false)
    expect(isWithinAttendanceEditWindow("2026-01-16", context)).toBe(false)
    expect(isWithinAttendanceEditWindow("2026-1-15", context)).toBe(false)
  })
})

describe("今日补卡时段", () => {
  const gate = {
    morningInWindowEnd: "09:30",
    afternoonInWindowEnd: "14:30",
  }

  it("窗口结束时仍不可补，结束后一分钟可补", () => {
    expect(passesMakeupTodayGate(true, 9 * 60 + 30, "morning_out", gate)).toBe(
      false
    )
    expect(passesMakeupTodayGate(true, 9 * 60 + 31, "morning_in", gate)).toBe(
      true
    )
    expect(
      passesMakeupTodayGate(true, 14 * 60 + 30, "afternoon_in", gate)
    ).toBe(false)
    expect(
      passesMakeupTodayGate(true, 14 * 60 + 31, "afternoon_out", gate)
    ).toBe(true)
  })

  it("历史日期不受时段限制，今日缺少配置时拒绝", () => {
    expect(passesMakeupTodayGate(false, 0, "morning_in", undefined)).toBe(true)
    expect(passesMakeupTodayGate(true, 24 * 60, "morning_in", undefined)).toBe(
      false
    )
  })
})

describe("补上班卡后的自动下班规则", () => {
  it("下班窗口结束时不触发，结束后立即触发", () => {
    expect(
      shouldAutoMakeupOut(
        attendanceDayjs("2026-09-14 14:20", "YYYY-MM-DD HH:mm"),
        "2026-09-14",
        "14:20"
      )
    ).toBe(false)
    expect(
      shouldAutoMakeupOut(
        attendanceDayjs("2026-09-14 14:21", "YYYY-MM-DD HH:mm"),
        "2026-09-14",
        "14:20"
      )
    ).toBe(true)
  })

  it("未来日期和非法结束时间不触发，历史日期触发", () => {
    const now = attendanceDayjs("2026-09-14 20:21", "YYYY-MM-DD HH:mm")
    expect(shouldAutoMakeupOut(now, "2026-09-15", "14:20")).toBe(false)
    expect(shouldAutoMakeupOut(now, "2026-09-13", "20:20")).toBe(true)
    expect(shouldAutoMakeupOut(now, "2026-09-14", "invalid")).toBe(false)
  })
})
