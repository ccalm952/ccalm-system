import { describe, expect, it } from "vitest";

import {
  buildPlanFollowUps,
  clean,
  matchPlanItemsForReturn,
  pickCourseInitial,
  pickInitialFull,
  pickReusableVisit,
  recordType,
  teeth,
  toothSet,
  visitInfo,
} from "./ekqy-import";

describe("ekqy-import helpers", () => {
  it("clean strips html breaks", () => {
    expect(clean("a<br/>b&nbsp;c")).toBe("a\nb c");
  });

  it("teeth normalizes fdi list", () => {
    expect(teeth(" 11, 21 ,")).toBe("11,21");
    expect([...toothSet("11,21")]).toEqual([11, 21]);
  });

  it("visitInfo drops midnight time", () => {
    expect(
      visitInfo({ id: 1, appointDateTime: "2024-01-02T00:00:00" }, new Map()),
    ).toEqual({ date: "2024-01-02", time: "" });
  });

  it("recordType detects ortho first", () => {
    expect(
      recordType(
        {
          id: 1,
          firstVisit: true,
          treatmentPlanList: [{ planContent: "隐形矫治" }],
        },
        new Map(),
      ),
    ).toBe("orthoFirst");
  });

  it("pickInitialFull prefers firstVisit", () => {
    expect(
      pickInitialFull(
        [
          { id: 2, firstVisit: false, appointDateTime: "2024-02-01" },
          { id: 1, firstVisit: true, appointDateTime: "2024-01-01" },
        ],
        new Map(),
      )?.id,
    ).toBe(1);
  });

  it("pickCourseInitial uses nearest preceding first", () => {
    const initials = [
      { type: "first", visitDate: "2022-08-08" },
      { type: "first", visitDate: "2026-04-10" },
    ];
    expect(
      pickCourseInitial({ type: "return", visitDate: "2026-11-13" }, initials)
        ?.visitDate,
    ).toBe("2026-04-10");
    expect(
      pickCourseInitial({ type: "return", visitDate: "2023-01-01" }, initials)
        ?.visitDate,
    ).toBe("2022-08-08");
  });

  it("matchPlanItemsForReturn prefers overlapping teeth", () => {
    const plans = [
      { id: 1, teeth: "27", text: "拔除" },
      { id: 2, teeth: "24,25", text: "松动牙治疗" },
    ];
    expect(
      matchPlanItemsForReturn(
        {
          id: 9,
          cureRecordList: [{ fdiToothCodes: "24,25", cure: "根备" }],
        },
        plans,
      ).map((p) => p.id),
    ).toEqual([2]);
  });

  it("buildPlanFollowUps links returns to the correct course", () => {
    const links = buildPlanFollowUps([
      {
        type: "first",
        visitDate: "2022-08-08",
        full: { id: 1 },
        planItems: [{ id: 119, teeth: "27", text: "拔除" }],
      },
      {
        type: "first",
        visitDate: "2026-04-10",
        full: { id: 2 },
        planItems: [{ id: 120, teeth: "24,25", text: "松动牙治疗" }],
      },
      {
        type: "return",
        visitDate: "2026-04-13",
        full: {
          id: 3,
          cureRecordList: [{ fdiToothCodes: "24,25", cure: "根备" }],
        },
        planItems: [],
      },
      {
        type: "return",
        visitDate: "2026-11-13",
        full: {
          id: 4,
          cureRecordList: [{ fdiToothCodes: "36", cure: "种植" }],
        },
        planItems: [],
      },
    ]);
    expect(links).toEqual([
      { recordIndex: 2, planItemId: 120 },
      { recordIndex: 3, planItemId: 120 },
    ]);
  });

  it("pickReusableVisit prefers appointment over exact imported time", () => {
    expect(
      pickReusableVisit(
        [
          {
            id: 266,
            visitDate: "2026-11-18",
            startTime: "16:00",
            hasRecords: false,
            hasAppointment: false,
          },
          {
            id: 118,
            visitDate: "2026-11-18",
            startTime: "15:38",
            hasRecords: false,
            hasAppointment: true,
          },
        ],
        "2026-11-18",
        "16:00",
      )?.id,
    ).toBe(118);
  });
});
