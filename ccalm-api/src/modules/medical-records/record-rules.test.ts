import { describe, expect, it } from "vitest";

import {
  hasTreatment,
  MEDICAL_RECORD_FIELDS,
  normalizePlanItems,
  normalizePlanLinks,
  normalizeTeethFdiString,
  normalizeToothEntries,
  pickRecordContent,
  planCourseStatus,
  planGroupLabel,
  planItemDoneDate,
  toFullWidthComma,
} from "./record-rules";

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

describe("normalizePlanItems", () => {
  it("保留组 id，明细进 lines，丢掉空组", () => {
    expect(
      normalizePlanItems([
        {
          id: 5,
          teeth: " 17,18 ",
          lines: [
            {
              id: 9,
              feeItemId: 3,
              name: " 残根拔除 ",
              teeth: "17",
              unitPrice: null,
            },
          ],
        },
        {
          teeth: "",
          lines: [{ feeItemId: 1, name: "取模", teeth: "" }],
        },
        { id: "x", teeth: "", lines: [] },
      ]),
    ).toEqual([
      {
        id: 5,
        teeth: "17,18",
        lines: [
          {
            id: 9,
            feeItemId: 3,
            name: "残根拔除",
            teeth: "17",
            unitPrice: null,
            quantity: null,
            discountPercent: null,
          },
        ],
      },
      {
        id: null,
        teeth: "",
        lines: [
          {
            id: null,
            feeItemId: 1,
            name: "取模",
            teeth: "",
            unitPrice: null,
            quantity: null,
            discountPercent: null,
          },
        ],
      },
    ]);
  });

  it("有单价未填数量时按牙位颗数补齐", () => {
    expect(
      normalizePlanItems([
        {
          teeth: "17,18,26",
          lines: [
            {
              feeItemId: 1,
              name: "修复",
              teeth: "",
              unitPrice: 400,
            },
            {
              feeItemId: 2,
              name: "拔除",
              teeth: "17",
              unitPrice: 300,
            },
          ],
        },
      ])[0].lines.map((l) => l.quantity),
    ).toEqual([3, 1]);
  });

  it("保留合法报价，丢掉负价、组外牙位明细", () => {
    expect(
      normalizePlanItems([
        {
          teeth: "17",
          lines: [
            {
              feeItemId: 2,
              name: "修复",
              teeth: "17",
              unitPrice: 400,
              quantity: 30,
              discountPercent: 66.67,
            },
            {
              feeItemId: 4,
              name: "拔除",
              teeth: "18",
              unitPrice: -1,
              quantity: 1,
            },
            {
              feeItemId: 5,
              name: "无效折扣",
              teeth: "17",
              unitPrice: 100,
              quantity: 1,
              discountPercent: 120,
            },
          ],
        },
      ]),
    ).toEqual([
      {
        id: null,
        teeth: "17",
        lines: [
          {
            id: null,
            feeItemId: 2,
            name: "修复",
            teeth: "17",
            unitPrice: 400,
            quantity: 30,
            discountPercent: 66.67,
          },
          {
            id: null,
            feeItemId: 5,
            name: "无效折扣",
            teeth: "17",
            unitPrice: 100,
            quantity: 1,
            discountPercent: null,
          },
        ],
      },
    ]);
  });
});

describe("planGroupLabel", () => {
  it("顿号拼接明细名", () => {
    expect(planGroupLabel([{ name: "种植" }, { name: "骨粉" }])).toBe(
      "种植，骨粉",
    );
  });
});

describe("planItemDoneDate", () => {
  it("没有复诊勾完成时未完成", () => {
    expect(
      planItemDoneDate([{ visitDate: "2026-11-01", completes: false }]),
    ).toBeNull();
  });

  it("取勾了完成的复诊里最晚的日期", () => {
    expect(
      planItemDoneDate([
        { visitDate: "2026-11-20", completes: true },
        { visitDate: "2026-11-01", completes: false },
        { visitDate: "2026-11-10", completes: true },
      ]),
    ).toBe("2026-11-20");
  });
});

describe("normalizePlanLinks", () => {
  it("同一行合并，任一勾了完成即完成", () => {
    expect(
      normalizePlanLinks([
        { planItemId: 5, completes: false },
        { planItemId: 6, completes: true },
        { planItemId: 5, completes: true },
      ]),
    ).toEqual([
      { planItemId: 5, completes: true },
      { planItemId: 6, completes: true },
    ]);
  });
});

describe("toFullWidthComma", () => {
  it("半角逗号改全角", () => {
    expect(toFullWidthComma("A,B,C")).toBe("A，B，C");
    expect(toFullWidthComma("无逗号")).toBe("无逗号");
  });
});

describe("normalizeTeethFdiString", () => {
  it("半角逗号分隔的 FDI 去重排序", () => {
    expect(normalizeTeethFdiString(" 17,14,15 ")).toBe("14,15,17");
    expect(normalizeTeethFdiString("11,21")).toBe("11,21");
  });

  it("非纯 FDI 当自由文本（含旧空格串，不自动改）", () => {
    expect(normalizeTeethFdiString("全口")).toBe("全口");
    expect(normalizeTeethFdiString("14 15")).toBe("14 15");
  });
});

describe("normalizeToothEntries", () => {
  it("去空白并丢掉牙位和内容都为空的条目；牙位统一逗号、正文半角逗号改全角", () => {
    expect(
      normalizeToothEntries([
        { teeth: " 11,21 ", text: " 拔除,备注 " },
        { teeth: "", text: "  " },
        { text: "口扫" },
        "bad",
      ]),
    ).toEqual([
      { teeth: "11,21", text: "拔除，备注" },
      { teeth: "", text: "口扫" },
    ]);
  });

  it("非数组返回空数组", () => {
    expect(normalizeToothEntries(null)).toEqual([]);
  });
});

describe("hasTreatment", () => {
  it("至少一条有内容才算填了处置", () => {
    expect(hasTreatment([{ teeth: "11", text: "" }])).toBe(false);
    expect(hasTreatment([{ teeth: "", text: "种植拆线" }])).toBe(true);
  });
});

describe("pickRecordContent", () => {
  const raw = {
    chiefComplaint: " 牙痛 ",
    presentIllness: "a,b",
    pastHistory: "x",
    oralExam: [{ teeth: "11", text: "龋" }],
    auxiliaryExam: "片",
    diagnosis: [{ teeth: "", text: "深龋" }],
    treatment: [{ teeth: "11", text: "充填" }],
    advice: "复诊",
    remark: "ok",
  };

  it("复诊只保留处置医嘱备注", () => {
    expect(pickRecordContent("return", raw)).toEqual({
      chiefComplaint: "",
      presentIllness: "",
      pastHistory: "",
      oralExam: [],
      auxiliaryExam: "",
      diagnosis: [],
      treatment: [{ teeth: "11", text: "充填" }],
      advice: "复诊",
      remark: "ok",
    });
  });

  it("初诊保留全套并改全角逗号", () => {
    const content = pickRecordContent("first", raw);
    expect(content.chiefComplaint).toBe("牙痛");
    expect(content.presentIllness).toBe("a，b");
    expect(MEDICAL_RECORD_FIELDS.first).toContain("treatmentPlan");
  });
});
