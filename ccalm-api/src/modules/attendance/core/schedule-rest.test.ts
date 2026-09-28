import { describe, expect, it } from "vitest"

import type { MakeupSlotType } from "./makeup-today-gate"
import { isPunchBlockedByScheduleRest } from "./schedule-rest"
import type { ScheduleShiftType } from "./schedule-inference"

const ALL_TYPES: MakeupSlotType[] = [
  "morning_in",
  "morning_out",
  "afternoon_in",
  "afternoon_out",
]

describe("isPunchBlockedByScheduleRest", () => {
  it("全天休息时四个时段全部被拦截", () => {
    for (const type of ALL_TYPES) {
      expect(isPunchBlockedByScheduleRest(type, "full_rest")).toBe(true)
    }
  })

  it("上午休息只拦截上午时段", () => {
    expect(isPunchBlockedByScheduleRest("morning_in", "morning_rest")).toBe(
      true
    )
    expect(isPunchBlockedByScheduleRest("morning_out", "morning_rest")).toBe(
      true
    )
    expect(isPunchBlockedByScheduleRest("afternoon_in", "morning_rest")).toBe(
      false
    )
    expect(isPunchBlockedByScheduleRest("afternoon_out", "morning_rest")).toBe(
      false
    )
  })

  it("下午休息只拦截下午时段", () => {
    expect(isPunchBlockedByScheduleRest("afternoon_in", "afternoon_rest")).toBe(
      true
    )
    expect(
      isPunchBlockedByScheduleRest("afternoon_out", "afternoon_rest")
    ).toBe(true)
    expect(isPunchBlockedByScheduleRest("morning_in", "afternoon_rest")).toBe(
      false
    )
    expect(isPunchBlockedByScheduleRest("morning_out", "afternoon_rest")).toBe(
      false
    )
  })

  it("未登记休息时不拦截", () => {
    for (const type of ALL_TYPES) {
      expect(isPunchBlockedByScheduleRest(type, null)).toBe(false)
      expect(isPunchBlockedByScheduleRest(type, undefined)).toBe(false)
    }
  })

  it("跨半天类型不互相误伤", () => {
    const cases: Array<[MakeupSlotType, ScheduleShiftType]> = [
      ["morning_in", "afternoon_rest"],
      ["morning_out", "afternoon_rest"],
      ["afternoon_in", "morning_rest"],
      ["afternoon_out", "morning_rest"],
    ]
    for (const [type, rest] of cases) {
      expect(isPunchBlockedByScheduleRest(type, rest)).toBe(false)
    }
  })
})
