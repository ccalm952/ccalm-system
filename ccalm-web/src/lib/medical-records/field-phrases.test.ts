import { describe, expect, it } from "vitest";

import {
  FIELD_PHRASES,
  filterPhraseGroups,
  insertPhrase,
  segmentBefore,
} from "./field-phrases";

describe("insertPhrase", () => {
  it("空文本直接放词条", () => {
    expect(insertPhrase("", 0, 0, "部位", "左下")).toEqual({
      text: "左下",
      caret: 2,
    });
  });

  it("部位、时间直接拼接，不加逗号", () => {
    expect(insertPhrase("左下", 2, 2, "部位", "后牙")).toEqual({
      text: "左下后牙",
      caret: 4,
    });
    expect(insertPhrase("冷热刺激痛", 5, 5, "时间", "1周")).toEqual({
      text: "冷热刺激痛1周",
      caret: 7,
    });
  });

  it("其他词条用中文逗号隔开", () => {
    expect(insertPhrase("左下后牙", 4, 4, "症状", "冷热刺激痛")).toEqual({
      text: "左下后牙，冷热刺激痛",
      caret: 10,
    });
  });

  it("已有结尾标点时不重复加逗号", () => {
    expect(insertPhrase("左下后牙，", 5, 5, "症状", "有洞")).toEqual({
      text: "左下后牙，有洞",
      caret: 7,
    });
  });

  it("插在中间时保留后面已写的内容", () => {
    const { text, caret } = insertPhrase(
      "左下后牙1周",
      4,
      4,
      "症状",
      "冷热刺激痛",
    );
    expect(text).toBe("左下后牙，冷热刺激痛1周");
    expect(caret).toBe(10);
  });

  it("有选中内容时替换选中部分", () => {
    expect(insertPhrase("左下后牙持续痛", 4, 8, "症状", "咬合不适").text).toBe(
      "左下后牙，咬合不适",
    );
  });
});

describe("filterPhraseGroups", () => {
  it("空关键字返回全部", () => {
    const groups = FIELD_PHRASES.chiefComplaint ?? [];
    expect(filterPhraseGroups(groups, "")).toEqual(groups);
  });

  it("按词条内容过滤，空的分类不返回", () => {
    const groups = filterPhraseGroups(FIELD_PHRASES.treatment ?? [], "根管");
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(group.phrases.every((p) => p.includes("根管"))).toBe(true);
    }
  });

  it("没有匹配时返回空数组", () => {
    expect(
      filterPhraseGroups(FIELD_PHRASES.advice ?? [], "不存在的词"),
    ).toEqual([]);
  });
});

describe("segmentBefore", () => {
  it("取光标前最后一个标点之后的片段", () => {
    expect(segmentBefore("左下后牙，冷热刺", 9)).toEqual({
      start: 5,
      text: "冷热刺",
    });
  });

  it("没有标点时返回整段", () => {
    expect(segmentBefore("左下后牙", 4)).toEqual({
      start: 0,
      text: "左下后牙",
    });
  });

  it("光标紧跟标点时片段为空", () => {
    expect(segmentBefore("左下后牙，", 5)).toEqual({ start: 5, text: "" });
  });

  it("空格也当分隔", () => {
    expect(segmentBefore("根管 预备", 5)).toEqual({ start: 3, text: "预备" });
  });
});

describe("FIELD_PHRASES", () => {
  it("主诉、现病史、处置等都有词条", () => {
    for (const field of [
      "chiefComplaint",
      "presentIllness",
      "pastHistory",
      "oralExam",
      "auxiliaryExam",
      "treatmentPlan",
      "treatment",
      "advice",
    ] as const) {
      expect(FIELD_PHRASES[field]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
