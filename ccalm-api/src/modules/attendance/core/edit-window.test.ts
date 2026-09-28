import { describe, expect, it } from "vitest"

import {
  buildEditWindowContext,
  isWithinAttendanceEditWindow,
} from "./edit-window"

describe("buildEditWindowContext", () => {
  it("普通月份的上一月补零", () => {
    expect(buildEditWindowContext("2026-03-09")).toEqual({
      todayYmd: "2026-03-09",
      currentMonth: "2026-03",
      previousMonth: "2026-02",
    })
    expect(buildEditWindowContext("2026-10-01").previousMonth).toBe("2026-09")
  })

  it("1 月的上一月是上一年 12 月（跨年）", () => {
    expect(buildEditWindowContext("2026-01-01").previousMonth).toBe("2025-12")
    expect(buildEditWindowContext("2000-01-31").previousMonth).toBe("1999-12")
  })

  it("12 月的上一月是同年 11 月", () => {
    expect(buildEditWindowContext("2026-12-31").previousMonth).toBe("2026-11")
  })
})

describe("isWithinAttendanceEditWindow", () => {
  const context = buildEditWindowContext("2026-03-15")

  it("允许本月早于等于今天的日期", () => {
    expect(isWithinAttendanceEditWindow("2026-03-01", context)).toBe(true)
    expect(isWithinAttendanceEditWindow("2026-03-15", context)).toBe(true)
  })

  it("拒绝本月未来日期", () => {
    expect(isWithinAttendanceEditWindow("2026-03-16", context)).toBe(false)
    expect(isWithinAttendanceEditWindow("2026-03-31", context)).toBe(false)
  })

  it("允许上一自然月整月", () => {
    expect(isWithinAttendanceEditWindow("2026-02-01", context)).toBe(true)
    expect(isWithinAttendanceEditWindow("2026-02-28", context)).toBe(true)
  })

  it("拒绝上上月及更早", () => {
    expect(isWithinAttendanceEditWindow("2026-01-31", context)).toBe(false)
    expect(isWithinAttendanceEditWindow("2025-12-31", context)).toBe(false)
  })

  it("拒绝跨年的本月未来日期", () => {
    const ctx = buildEditWindowContext("2026-01-05")
    expect(isWithinAttendanceEditWindow("2026-01-05", ctx)).toBe(true)
    expect(isWithinAttendanceEditWindow("2026-01-06", ctx)).toBe(false)
    expect(isWithinAttendanceEditWindow("2025-12-31", ctx)).toBe(true)
    expect(isWithinAttendanceEditWindow("2025-11-30", ctx)).toBe(false)
  })

  it("严格校验 YYYY-MM-DD 格式", () => {
    expect(isWithinAttendanceEditWindow("2026-3-15", context)).toBe(false)
    expect(isWithinAttendanceEditWindow("2026-03-5", context)).toBe(false)
    expect(isWithinAttendanceEditWindow("20260315", context)).toBe(false)
    expect(isWithinAttendanceEditWindow("2026/03/15", context)).toBe(false)
    expect(isWithinAttendanceEditWindow("", context)).toBe(false)
  })

  it("不校验日期是否真实存在，只比对字符串", () => {
    // 2026-02-30 不存在，但字符串比较与月份前缀均通过
    expect(isWithinAttendanceEditWindow("2026-02-30", context)).toBe(true)
    expect(isWithinAttendanceEditWindow("2026-03-00", context)).toBe(true)
  })
})
