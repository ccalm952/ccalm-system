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

  it("matchPlanItemsForReturn prefers specific teeth over full-arch ortho", () => {
    const plans = [
      {
        id: 1,
        teeth:
          "11,12,13,14,15,16,17,21,22,23,24,25,26,27,31,32,33,34,35,36,37,41,42,43,44,45,46,47",
        text: "矫正12000，优惠后10000",
      },
      { id: 2, teeth: "16,46", text: "治疗300x2=600" },
      { id: 3, teeth: "16,46", text: "打桩200x2=400" },
    ];
    expect(
      matchPlanItemsForReturn(
        {
          id: 9,
          cureRecordList: [
            { fdiToothCodes: "16,46", cure: "已根充，上头光固化树脂恢复。" },
          ],
        },
        plans,
      ).map((p) => p.id),
    ).toEqual([2]);
  });

  it("matchPlanItemsForReturn links ortho text to矫正 plan", () => {
    const plans = [
      {
        id: 1,
        teeth:
          "11,12,13,14,15,16,17,21,22,23,24,25,26,27,31,32,33,34,35,36,37,41,42,43,44,45,46,47",
        text: "矫正12000，优惠后10000",
      },
      { id: 2, teeth: "16,46", text: "治疗300x2=600" },
      { id: 3, teeth: "11,12,16,46", text: "修复1000x4=4000" },
    ];
    expect(
      matchPlanItemsForReturn(
        {
          id: 9,
          cureRecordList: [
            { fdiToothCodes: "11,12,13,21,22,23", cure: "弹力绳解除" },
          ],
        },
        plans,
      ).map((p) => p.id),
    ).toEqual([1]);
  });

  it("matchPlanItemsForReturn keeps bracket bonding on矫正 not 充填", () => {
    const plans = [
      { id: 1, teeth: "", text: "矫正费用10000" },
      { id: 2, teeth: "16,26,36,46", text: "充填各200总800" },
    ];
    expect(
      matchPlanItemsForReturn(
        {
          id: 9,
          cureRecordList: [
            {
              fdiToothCodes:
                "11,12,13,14,15,16,21,22,23,24,25,26,31,32,33,34,35,36,41,42,43,44,45,46",
              cure: "托槽粘接",
            },
          ],
        },
        plans,
      ).map((p) => p.id),
    ).toEqual([1]);
  });

  it("matchPlanItemsForReturn picks one plan for mixed cures", () => {
    const plans = [
      {
        id: 1,
        teeth:
          "11,12,13,14,15,16,17,21,22,23,24,25,26,27,31,32,33,34,35,36,37,41,42,43,44,45,46,47",
        text: "矫正12000，优惠后10000",
      },
      { id: 2, teeth: "16,46", text: "治疗300x2=600" },
      { id: 3, teeth: "16,46", text: "打桩200x2=400" },
    ];
    expect(
      matchPlanItemsForReturn(
        {
          id: 9,
          cureRecordList: [
            { fdiToothCodes: "16,46", cure: "已根充，上头光固化树脂恢复。" },
            { fdiToothCodes: "11,12,13,21,22,23", cure: "弹力绳解除" },
            { fdiToothCodes: "", cure: "中线偏右，整往左边斜拉。" },
          ],
        },
        plans,
      ).map((p) => p.id),
    ).toEqual([1]);
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
