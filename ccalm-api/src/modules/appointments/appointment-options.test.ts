import { describe, expect, it } from "vitest";

import { fromMinutes, hasOverlap, toMinutes } from "./appointment-options";

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
