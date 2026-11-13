import { describe, expect, it } from "vitest";

import {
  implantCountsForPending,
  remainingPendingTeeth,
} from "./pending-teeth";

describe("remainingPendingTeeth", () => {
  it("去掉已种的牙位，保留未种的", () => {
    expect(remainingPendingTeeth("32 34 36 42", ["34", "42"])).toEqual([
      "32",
      "36",
    ]);
  });

  it("全部种完返回空数组", () => {
    expect(remainingPendingTeeth("16、17", ["16", "17", "26"])).toEqual([]);
  });

  it("支持顿号、逗号、斜杠分隔", () => {
    expect(remainingPendingTeeth("26/27，36,37", ["27", "36"])).toEqual([
      "26",
      "37",
    ]);
  });

  it("已种牙位一格里写了多颗也能识别", () => {
    expect(remainingPendingTeeth("46 47", ["46 47"])).toEqual([]);
  });

  it("一颗都没种到时不处理", () => {
    expect(remainingPendingTeeth("47", ["36", "37", "46"])).toBeNull();
  });

  it("含文字说明时不处理", () => {
    expect(remainingPendingTeeth("26/27，36/37可先种", ["36"])).toBeNull();
  });

  it("空牙位或非法牙位不处理", () => {
    expect(remainingPendingTeeth("", ["46"])).toBeNull();
    expect(remainingPendingTeeth("19 46", ["46"])).toBeNull();
    expect(remainingPendingTeeth("56", ["56"])).toBeNull();
  });
});

describe("implantCountsForPending", () => {
  it("拔牙日期当天及之后的种植才算", () => {
    const pending = { extractionDate: "2026-06-02", createdDate: "2026-08-09" };
    expect(implantCountsForPending("2026-01-22", pending)).toBe(false);
    expect(implantCountsForPending("2026-06-02", pending)).toBe(true);
  });

  it("没填拔牙日期时按登记日期算", () => {
    const pending = { extractionDate: null, createdDate: "2026-08-11" };
    expect(implantCountsForPending("2026-08-10", pending)).toBe(false);
    expect(implantCountsForPending("2026-08-29", pending)).toBe(true);
  });
});
