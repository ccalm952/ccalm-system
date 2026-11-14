import { describe, expect, it } from "vitest";

import { isFollowUpDue } from "./follow-up-options";

const TODAY = "2026-11-14";

describe("isFollowUpDue", () => {
  it("计划日期是今天，待随访", () => {
    expect(isFollowUpDue("pending", TODAY, TODAY)).toBe(true);
  });

  it("计划日期已过，逾期待随访", () => {
    expect(isFollowUpDue("pending", "2026-11-10", TODAY)).toBe(true);
  });

  it("计划日期还没到，不算待随访", () => {
    expect(isFollowUpDue("pending", "2026-11-20", TODAY)).toBe(false);
  });

  it("已随访和已取消都不算待随访", () => {
    expect(isFollowUpDue("done", "2026-11-10", TODAY)).toBe(false);
    expect(isFollowUpDue("cancelled", "2026-11-10", TODAY)).toBe(false);
  });
});
