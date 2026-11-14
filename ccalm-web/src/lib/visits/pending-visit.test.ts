import { describe, expect, it } from "vitest";

import { pickPendingVisitId } from "./pending-visit";

const TODAY = "2026-11-14";

function visit(
  overrides: Partial<Parameters<typeof pickPendingVisitId>[0][0]>,
) {
  return {
    id: 1,
    visitDate: TODAY,
    status: "arrived",
    medicalRecordIds: [],
    ...overrides,
  };
}

describe("pickPendingVisitId", () => {
  it("选中当天还没写病历的就诊", () => {
    expect(pickPendingVisitId([visit({ id: 7 })], TODAY)).toBe(7);
  });

  it("有多条时取最新的一条", () => {
    expect(
      pickPendingVisitId([visit({ id: 3 }), visit({ id: 9 })], TODAY),
    ).toBe(9);
  });

  it("跳过已完成的就诊", () => {
    expect(
      pickPendingVisitId([visit({ status: "completed" })], TODAY),
    ).toBeNull();
  });

  it("跳过已经挂了病历的就诊", () => {
    expect(
      pickPendingVisitId([visit({ medicalRecordIds: [100] })], TODAY),
    ).toBeNull();
  });

  it("跳过别的日期", () => {
    expect(
      pickPendingVisitId([visit({ visitDate: "2026-11-13" })], TODAY),
    ).toBeNull();
  });

  it("没有可用就诊时返回 null", () => {
    expect(pickPendingVisitId([], TODAY)).toBeNull();
  });
});
