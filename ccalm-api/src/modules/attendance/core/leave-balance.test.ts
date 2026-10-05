import { describe, expect, it } from "vitest";

import { remainingLeaveSinceStart } from "./leave-balance";

describe("remainingLeaveSinceStart", () => {
  const allowance = new Map([
    ["2026-01", 2],
    ["2026-02", 2],
    ["2026-03", 4],
  ]);

  it("创建月之前只返回初始额度", () => {
    expect(
      remainingLeaveSinceStart({
        createdMonth: "2026-03",
        month: "2026-01",
        initialBalance: 5,
        allowanceByMonth: allowance,
        leaveDaysByMonth: new Map([["2026-01", 2]]),
        offsetDaysByMonth: new Map([["2026-01", 4]]),
      }),
    ).toBe(5);
  });

  it("从创建月累加每月假期并扣掉已休", () => {
    expect(
      remainingLeaveSinceStart({
        createdMonth: "2026-02",
        month: "2026-03",
        initialBalance: 3,
        allowanceByMonth: allowance,
        leaveDaysByMonth: new Map([
          ["2026-02", 0.5],
          ["2026-03", 1],
        ]),
      }),
    ).toBe(7.5);
  });

  it("假期抵消加进剩余假期", () => {
    expect(
      remainingLeaveSinceStart({
        createdMonth: "2026-02",
        month: "2026-03",
        initialBalance: 0,
        allowanceByMonth: allowance,
        leaveDaysByMonth: new Map([["2026-03", 1]]),
        offsetDaysByMonth: new Map([["2026-03", 4]]),
      }),
    ).toBe(9);
  });
});
