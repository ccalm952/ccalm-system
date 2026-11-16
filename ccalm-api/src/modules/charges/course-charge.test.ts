import { describe, expect, it } from "vitest";

import { courseChargeItems } from "./course-charge";

describe("courseChargeItems", () => {
  it("按计划报价生成明细并合计应收", () => {
    expect(
      courseChargeItems([
        {
          teeth: "7654",
          text: "固定桥修复",
          unitPrice: 600,
          quantity: 8,
        },
        { teeth: "8", text: "拔除", unitPrice: 300, quantity: 1 },
      ]),
    ).toEqual({
      items: [
        {
          feeItemId: null,
          name: "固定桥修复",
          teeth: "7654",
          unitPrice: 600,
          quantity: 8,
          amount: 4800,
        },
        {
          feeItemId: null,
          name: "拔除",
          teeth: "8",
          unitPrice: 300,
          quantity: 1,
          amount: 300,
        },
      ],
      unquotedCount: 0,
      receivable: 5100,
    });
  });

  it("未填数量时按 1 计，未报价的行不计入并计数", () => {
    expect(
      courseChargeItems([
        { teeth: "7", text: "根管治疗", unitPrice: 800, quantity: null },
        { teeth: "8", text: "拔除", unitPrice: null, quantity: null },
      ]),
    ).toEqual({
      items: [
        {
          feeItemId: null,
          name: "根管治疗",
          teeth: "7",
          unitPrice: 800,
          quantity: 1,
          amount: 800,
        },
      ],
      unquotedCount: 1,
      receivable: 800,
    });
  });

  it("金额四舍五入到分，忽略无名称的行", () => {
    const result = courseChargeItems([
      { teeth: "11", text: "树脂充填", unitPrice: 0.1, quantity: 3 },
      { teeth: "12", text: "  ", unitPrice: 100, quantity: 1 },
    ]);
    expect(result.receivable).toBe(0.3);
    expect(result.items).toHaveLength(1);
    expect(result.unquotedCount).toBe(0);
  });
});
