import { describe, expect, it } from "vitest";

import { withEmployeeLeaveDays } from "./leave-offset";

describe("withEmployeeLeaveDays", () => {
  it("writes leave days onto the employee with the same name", () => {
    const result = withEmployeeLeaveDays(
      { employees: [{ name: "陈美珍", leaveDays: 1 }] },
      "陈美珍",
      2.5,
    );
    expect(result.applied).toBe(true);
    expect(result.data.employees).toEqual([{ name: "陈美珍", leaveDays: 2.5 }]);
  });

  it("leaves the sheet unchanged when the days already match", () => {
    const data = { employees: [{ name: "卢彤", leaveDays: 1 }] };
    const result = withEmployeeLeaveDays(data, "卢彤", 1);
    expect(result.applied).toBe(true);
    expect(result.data).toBe(data);
  });

  it("does not apply when no employee has that name", () => {
    const data = { employees: [{ name: "其他人", leaveDays: 3 }] };
    const result = withEmployeeLeaveDays(data, "许桦婧", 1);
    expect(result.applied).toBe(false);
    expect(result.data).toBe(data);
  });
});
