import { describe, expect, it } from "vitest";

import {
  cleanPlanItems,
  cleanToothEntries,
  hasTreatment,
  MEDICAL_RECORD_FIELDS,
  planCourseStatus,
  planItemAmount,
} from "./record-types";

describe("planCourseStatus", () => {
  it("没有计划行时无治疗", () => {
    expect(planCourseStatus([], null)).toBe("none");
  });

  it("有一行未完成即待完成", () => {
    expect(
      planCourseStatus([{ doneDate: "2026-11-01" }, { doneDate: null }], null),
    ).toBe("pending");
  });

  it("全部完成才完成，终止日期不影响", () => {
    expect(planCourseStatus([{ doneDate: "2026-11-01" }], null)).toBe("done");
    expect(planCourseStatus([{ doneDate: "2026-11-01" }], "2026-11-05")).toBe(
      "done",
    );
  });

  it("未完成且已终止为终止", () => {
    expect(planCourseStatus([{ doneDate: null }], "2026-11-05")).toBe(
      "stopped",
    );
  });
});

describe("record-types", () => {
  it("复诊只有处置、医嘱、备注", () => {
    expect(MEDICAL_RECORD_FIELDS.return).toEqual([
      "treatment",
      "advice",
      "remark",
    ]);
    expect(MEDICAL_RECORD_FIELDS.orthoFirst).toContain("chiefComplaint");
  });

  it("初诊不写处置", () => {
    expect(MEDICAL_RECORD_FIELDS.first).toContain("treatment");
    expect(MEDICAL_RECORD_FIELDS.first).toContain("treatmentPlan");
  });

  it("处置至少一条有内容", () => {
    expect(hasTreatment([{ teeth: "11", text: " " }])).toBe(false);
    expect(hasTreatment([{ teeth: "", text: "拆线" }])).toBe(true);
  });

  it("清理空条目", () => {
    expect(
      cleanToothEntries([
        { teeth: " 36 ", text: " 充填 " },
        { teeth: "", text: "" },
      ]),
    ).toEqual([{ teeth: "36", text: "充填" }]);
  });

  it("清理计划组时保留 id 与明细", () => {
    expect(
      cleanPlanItems([
        {
          id: 5,
          teeth: " 17 ",
          text: "",
          lines: [
            {
              id: 9,
              feeItemId: 1,
              name: " 拔除 ",
              teeth: "",
              unitPrice: null,
            },
          ],
          doneDate: null,
        },
        {
          teeth: "",
          text: "",
          lines: [{ feeItemId: 2, name: "取模", teeth: "" }],
        },
        { id: 6, teeth: "", text: "", lines: [] },
      ]),
    ).toEqual([
      {
        id: 5,
        teeth: "17",
        lines: [
          {
            id: 9,
            feeItemId: 1,
            name: "拔除",
            teeth: "",
            unitPrice: null,
            quantity: null,
            discountNote: "",
          },
        ],
      },
      {
        id: undefined,
        teeth: "",
        lines: [
          {
            id: undefined,
            feeItemId: 2,
            name: "取模",
            teeth: "",
            unitPrice: null,
            quantity: null,
            discountNote: "",
          },
        ],
      },
    ]);
  });

  it("有单价未填数量时按牙位颗数，无牙位为 1", () => {
    expect(
      cleanPlanItems([
        {
          teeth: "17,18,26",
          text: "",
          lines: [
            {
              feeItemId: 1,
              name: "修复",
              teeth: "",
              unitPrice: 400,
              discountNote: " 优惠 ",
            },
            { feeItemId: 2, name: "洁牙", teeth: "", unitPrice: 300 },
            {
              feeItemId: 3,
              name: "治疗",
              teeth: "17",
              unitPrice: 300,
              quantity: 2,
            },
          ],
        },
      ])[0].lines.map((i) => [i.quantity, i.discountNote]),
    ).toEqual([
      [3, "优惠"],
      [3, ""],
      [2, ""],
    ]);
  });

  it("组报价金额 = 明细合计（缺数量按牙位颗数）", () => {
    expect(
      planItemAmount({
        teeth: "17,18",
        text: "",
        lines: [
          {
            feeItemId: 1,
            name: "修复",
            teeth: "",
            unitPrice: 400,
          },
        ],
      }),
    ).toBe(800);
    expect(
      planItemAmount({
        teeth: "17",
        text: "",
        lines: [
          {
            feeItemId: 1,
            name: "a",
            teeth: "",
            unitPrice: 100,
            quantity: 6,
          },
        ],
      }),
    ).toBe(600);
    expect(planItemAmount({ teeth: "17", text: "", lines: [] })).toBeNull();
  });
});
