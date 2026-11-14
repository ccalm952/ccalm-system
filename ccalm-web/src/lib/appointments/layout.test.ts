import { describe, expect, it } from "vitest";

import { assignLanes } from "./layout";

const slot = (startTime: string, endTime: string, key = startTime) => ({
  key,
  startTime,
  endTime,
});

describe("assignLanes", () => {
  it("不重叠的卡片各占满整列", () => {
    const rows = assignLanes([
      slot("09:00", "10:00", "a"),
      slot("10:00", "11:00", "b"),
    ]);
    expect(rows.map((r) => r.lanes)).toEqual([1, 1]);
  });

  it("两条重叠拆成两道", () => {
    const rows = assignLanes([
      slot("09:00", "10:00", "a"),
      slot("09:30", "10:30", "b"),
    ]);
    expect(rows.map((r) => r.lanes)).toEqual([2, 2]);
    expect(rows.map((r) => r.lane).sort()).toEqual([0, 1]);
  });

  it("三条同时重叠拆成三道", () => {
    const rows = assignLanes([
      slot("09:00", "11:00", "a"),
      slot("09:15", "10:00", "b"),
      slot("09:30", "10:30", "c"),
    ]);
    expect(new Set(rows.map((r) => r.lanes))).toEqual(new Set([3]));
  });

  it("重叠结束后新簇重新占满整列", () => {
    const rows = assignLanes([
      slot("09:00", "10:00", "a"),
      slot("09:30", "10:30", "b"),
      slot("11:00", "12:00", "c"),
    ]);
    const c = rows.find((r) => r.key === "c");
    expect(c?.lanes).toBe(1);
  });

  it("空时段或非法时间被忽略", () => {
    expect(assignLanes([slot("", ""), slot("10:00", "10:00")])).toEqual([]);
  });
});
