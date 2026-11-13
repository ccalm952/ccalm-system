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
  it("没有计划行时无疗程", () => {
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
    expect(MEDICAL_RECORD_FIELDS.first).not.toContain("treatment");
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

  it("清理计划行时保留 id", () => {
    expect(
      cleanPlanItems([
        { id: 5, teeth: " 17 ", text: " 拔除 ", doneDate: null },
        { teeth: "", text: "取模" },
        { id: 6, teeth: "", text: " " },
      ]),
    ).toEqual([
      {
        id: 5,
        teeth: "17",
        text: "拔除",
        unitPrice: null,
        quantity: null,
        discountNote: "",
      },
      {
        id: undefined,
        teeth: "",
        text: "取模",
        unitPrice: null,
        quantity: null,
        discountNote: "",
      },
    ]);
  });

  it("有单价未填数量时按牙位颗数，无牙位为 1", () => {
    expect(
      cleanPlanItems([
        {
          teeth: "17 18 26",
          text: "修复",
          unitPrice: 400,
          discountNote: " 优惠 ",
        },
        { teeth: "", text: "洁牙", unitPrice: 300 },
        { teeth: "11", text: "治疗", unitPrice: 300, quantity: 2 },
      ]).map((i) => [i.quantity, i.discountNote]),
    ).toEqual([
      [3, "优惠"],
      [1, ""],
      [2, ""],
    ]);
  });

  it("报价金额 = 单价 × 数量（缺数量按牙位颗数）", () => {
    expect(planItemAmount({ teeth: "17 18", text: "", unitPrice: 400 })).toBe(
      800,
    );
    expect(
      planItemAmount({ teeth: "17", text: "", unitPrice: 100, quantity: 6 }),
    ).toBe(600);
    expect(planItemAmount({ teeth: "17", text: "" })).toBeNull();
  });
});
