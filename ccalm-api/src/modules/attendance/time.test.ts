import { describe, expect, it } from "vitest"

import { isWallClockAfterMinutes, minutesFromMidnight } from "./time"

describe("minutesFromMidnight", () => {
  it("把 HH:mm 换算成当日分钟数", () => {
    expect(minutesFromMidnight("00:00")).toBe(0)
    expect(minutesFromMidnight("08:30")).toBe(510)
    expect(minutesFromMidnight("14:20")).toBe(860)
    expect(minutesFromMidnight("23:59")).toBe(1439)
  })

  it("允许 24:00 这类越界时刻，不做范围校验", () => {
    expect(minutesFromMidnight("24:00")).toBe(1440)
    expect(minutesFromMidnight("25:61")).toBe(1561)
  })

  it("忽略秒与多余空格", () => {
    expect(minutesFromMidnight(" 09:15 ")).toBe(555)
    expect(minutesFromMidnight("08:30:45")).toBe(510)
  })

  it("只有小时没有分钟时返回 NaN", () => {
    expect(Number.isNaN(minutesFromMidnight("8"))).toBe(true)
    expect(Number.isNaN(minutesFromMidnight(""))).toBe(true)
    expect(Number.isNaN(minutesFromMidnight("   "))).toBe(true)
  })

  it("非法字符串返回 NaN", () => {
    expect(Number.isNaN(minutesFromMidnight("abcd"))).toBe(true)
    expect(Number.isNaN(minutesFromMidnight("hh:mm"))).toBe(true)
    expect(Number.isNaN(minutesFromMidnight("08:xx"))).toBe(true)
  })

  it("负数小时会被当作真实数字处理", () => {
    expect(minutesFromMidnight("-1:30")).toBe(-30)
  })
})

describe("isWallClockAfterMinutes", () => {
  it("严格大于目标时刻才为真", () => {
    expect(isWallClockAfterMinutes(511, "08:30")).toBe(true)
    expect(isWallClockAfterMinutes(510, "08:30")).toBe(false)
    expect(isWallClockAfterMinutes(509, "08:30")).toBe(false)
    expect(isWallClockAfterMinutes(0, "00:00")).toBe(false)
    expect(isWallClockAfterMinutes(1, "00:00")).toBe(true)
  })

  it("目标时刻非法时一律为假", () => {
    expect(isWallClockAfterMinutes(600, "")).toBe(false)
    expect(isWallClockAfterMinutes(600, "invalid")).toBe(false)
    expect(isWallClockAfterMinutes(600, "8")).toBe(false)
  })
})
