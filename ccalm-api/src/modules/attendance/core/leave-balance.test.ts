import { describe, expect, it } from "vitest";

import { isLeaveStartDate, remainingLeaveSinceStart } from "./leave-balance";

describe("remainingLeaveSinceStart", () => {
  const allowance = new Map([
    ["2026-01", 2],
    ["2026-02", 2],
    ["2026-03", 4],
  ]);

  it("起始月之前剩余为 0", () => {
    expect(
      remainingLeaveSinceStart({
        startDate: "2026-03-10",
        month: "2026-02",
        allowanceByMonth: allowance,
        leaveDaysByMonth: new Map(),
      }),
    ).toBe(0);
  });

  it("从起始月累加到查看月，并扣掉已休", () => {
    expect(
      remainingLeaveSinceStart({
        startDate: "2026-02-15",
        month: "2026-03",
        allowanceByMonth: allowance,
        leaveDaysByMonth: new Map([
          ["2026-02", 0.5],
          ["2026-03", 1],
        ]),
      }),
    ).toBe(4.5);
  });

  it("拒绝不存在的日期", () => {
    expect(isLeaveStartDate("2026-02-31")).toBe(false);
  });
});
