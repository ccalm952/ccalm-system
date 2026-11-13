import { describe, expect, it } from "vitest";

import {
  hasTreatment,
  isOrthoRecordType,
  normalizePlanItems,
  normalizePlanLinks,
  normalizeToothEntries,
  pickRecordContent,
  planCourseStatus,
  planItemDoneDate,
} from "./record-rules";

describe("isOrthoRecordType", () => {
  it("只有正畸初诊、正畸复诊算正畸就诊", () => {
    expect(isOrthoRecordType("orthoFirst")).toBe(true);
    expect(isOrthoRecordType("orthoReturn")).toBe(true);
    expect(isOrthoRecordType("first")).toBe(false);
    expect(isOrthoRecordType("return")).toBe(false);
  });
});

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

describe("normalizePlanItems", () => {
  it("保留整数 id，新行 id 为 null，丢掉空行", () => {
    expect(
      normalizePlanItems([
        { id: 5, teeth: " 17 18 ", text: " 残根拔除 " },
        { teeth: "", text: "取模" },
        { id: "x", teeth: "", text: " " },
      ]),
    ).toEqual([
      {
        id: 5,
        teeth: "17 18",
        text: "残根拔除",
        unitPrice: null,
        quantity: null,
        discountNote: "",
      },
      {
        id: null,
        teeth: "",
        text: "取模",
        unitPrice: null,
        quantity: null,
        discountNote: "",
      },
    ]);
  });

  it("保留合法报价，丢掉负价和非正整数数量", () => {
    expect(
      normalizePlanItems([
        {
          teeth: "17",
          text: "修复",
          unitPrice: 400,
          quantity: 30,
          discountNote: " 治疗拔牙优惠 ",
        },
        { teeth: "18", text: "拔除", unitPrice: -1, quantity: 1.5 },
      ]),
    ).toEqual([
      {
        id: null,
        teeth: "17",
        text: "修复",
        unitPrice: 400,
        quantity: 30,
        discountNote: "治疗拔牙优惠",
      },
      {
        id: null,
        teeth: "18",
        text: "拔除",
        unitPrice: null,
        quantity: null,
        discountNote: "",
      },
    ]);
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

describe("normalizeToothEntries", () => {
  it("去空白并丢掉牙位和内容都为空的条目", () => {
    expect(
      normalizeToothEntries([
        { teeth: " 11,21 ", text: " 拔除 " },
        { teeth: "", text: "  " },
        { text: "口扫" },
        "bad",
      ]),
    ).toEqual([
      { teeth: "11,21", text: "拔除" },
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
    oralExam: [{ teeth: "36", text: "叩痛" }],
    diagnosis: [{ teeth: "36", text: "龋齿" }],
    treatment: [{ teeth: "36", text: "充填" }],
    advice: "不适随诊",
  };

  it("初诊保留主诉和诊断，不写处置", () => {
    const c = pickRecordContent("first", raw);
    expect(c.chiefComplaint).toBe("牙痛");
    expect(c.diagnosis).toEqual([{ teeth: "36", text: "龋齿" }]);
    expect(c.treatment).toEqual([]);
  });

  it("复诊清空主诉和诊断", () => {
    const c = pickRecordContent("return", raw);
    expect(c.chiefComplaint).toBe("");
    expect(c.diagnosis).toEqual([]);
    expect(c.oralExam).toEqual([]);
    expect(c.treatment).toEqual([{ teeth: "36", text: "充填" }]);
    expect(c.advice).toBe("不适随诊");
  });
});
