import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { daysSinceVisit, isOrthodonticsFollowUpDue } from "./follow-up";

describe("daysSinceVisit", () => {
  const today = dayjs("2026-11-12");

  it("按自然日计算", () => {
    expect(daysSinceVisit("2026-11-12", today)).toBe(0);
    expect(daysSinceVisit("2026-10-12", today)).toBe(31);
  });

  it("空或无效日期返回 null", () => {
    expect(daysSinceVisit(null, today)).toBeNull();
    expect(daysSinceVisit("abc", today)).toBeNull();
  });
});

describe("isOrthodonticsFollowUpDue", () => {
  it("超过 30 天才算待随访", () => {
    expect(isOrthodonticsFollowUpDue("treating", 30)).toBe(false);
    expect(isOrthodonticsFollowUpDue("treating", 31)).toBe(true);
    expect(isOrthodonticsFollowUpDue("invisible", 31)).toBe(true);
    expect(isOrthodonticsFollowUpDue("appliance", 31)).toBe(true);
  });

  it("已完成的不算", () => {
    expect(isOrthodonticsFollowUpDue("completed", 365)).toBe(false);
  });

  it("没有上次就诊日期的不算", () => {
    expect(isOrthodonticsFollowUpDue("treating", null)).toBe(false);
  });
});
