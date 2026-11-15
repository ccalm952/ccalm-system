import { describe, expect, it } from "vitest";

import {
  fromMinutes,
  hasOverlap,
  slotDurationError,
  toMinutes,
} from "./appointment-options";

describe("hasOverlap", () => {
  it("相交的时段算冲突", () => {
    expect(hasOverlap("09:00", "10:00", "09:30", "10:30")).toBe(true);
  });
  it("包含关系算冲突", () => {
    expect(hasOverlap("09:00", "12:00", "10:00", "10:30")).toBe(true);
  });
  it("首尾相接不算冲突", () => {
    expect(hasOverlap("09:00", "10:00", "10:00", "10:30")).toBe(false);
  });
  it("完全错开不算冲突", () => {
    expect(hasOverlap("09:00", "10:00", "14:00", "15:00")).toBe(false);
  });
  it("空时段不算冲突", () => {
    expect(hasOverlap("", "", "09:00", "10:00")).toBe(false);
  });
});

describe("时间换算", () => {
  it("toMinutes", () => {
    expect(toMinutes("08:30")).toBe(510);
  });
  it("fromMinutes", () => {
    expect(fromMinutes(510)).toBe("08:30");
    expect(fromMinutes(14 * 60 + 5)).toBe("14:05");
  });
});


describe("slotDurationError", () => {
  it("30 分钟合法", () => {
    expect(slotDurationError("09:00", "09:30")).toBeNull();
  });
  it("15 分钟合法", () => {
    expect(slotDurationError("09:00", "09:15")).toBeNull();
  });
  it("120 分钟合法", () => {
    expect(slotDurationError("09:00", "11:00")).toBeNull();
  });
  it("开始时间不要求整点，只要时长是 15 的倍数", () => {
    expect(slotDurationError("08:37", "09:07")).toBeNull();
  });
  it("23 分钟拒绝", () => {
    expect(slotDurationError("08:37", "09:00")).toContain("15 分钟");
  });
  it("短于 15 分钟拒绝", () => {
    expect(slotDurationError("09:00", "09:10")).toContain("15 分钟");
  });
  it("超过 120 分钟拒绝", () => {
    expect(slotDurationError("09:00", "11:15")).toContain("15 分钟");
  });
  it("结束早于开始拒绝", () => {
    expect(slotDurationError("10:00", "09:00")).toContain("15 分钟");
  });
});
