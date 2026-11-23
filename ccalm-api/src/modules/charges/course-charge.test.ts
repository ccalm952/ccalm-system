import { describe, expect, it } from "vitest";

import { courseChargeItems } from "./course-charge";

describe("courseChargeItems", () => {
  it("展平各组已报价明细并合计应收", () => {
    expect(
      courseChargeItems([
        {
          teeth: "14,15,17",
          lines: [
            {
              feeItemId: 1,
              name: "固定桥修复",
              teeth: "",
              unitPrice: 600,
              quantity: 8,
            },
            {
              feeItemId: 2,
              name: "拔除",
              teeth: "17",
              unitPrice: 300,
              quantity: 1,
            },
          ],
        },
      ]),
    ).toEqual({
      items: [
        {
          feeItemId: 1,
          name: "固定桥修复",
          teeth: "14,15,17",
          unitPrice: 600,
          quantity: 8,
          amount: 4800,
        },
        {
          feeItemId: 2,
          name: "拔除",
          teeth: "17",
          unitPrice: 300,
          quantity: 1,
          amount: 300,
        },
      ],
      unquotedCount: 0,
      receivable: 5100,
    });
  });

  it("未填数量时按牙位颗数，无合法牙位为 1；未报价明细不计入并计数", () => {
    expect(
      courseChargeItems([
        {
          teeth: "14,15,17",
          lines: [
            {
              feeItemId: 3,
              name: "根管治疗",
              teeth: "",
              unitPrice: 800,
              quantity: null,
            },
            {
              feeItemId: 4,
              name: "拔除",
              teeth: "17",
              unitPrice: 300,
              quantity: null,
            },
            {
              feeItemId: 5,
              name: "洁牙",
              teeth: "",
              unitPrice: null,
              quantity: null,
            },
          ],
        },
      ]),
    ).toEqual({
      items: [
        {
          feeItemId: 3,
          name: "根管治疗",
          teeth: "14,15,17",
          unitPrice: 800,
          quantity: 3,
          amount: 2400,
        },
        {
          feeItemId: 4,
          name: "拔除",
          teeth: "17",
          unitPrice: 300,
          quantity: 1,
          amount: 300,
        },
      ],
      unquotedCount: 1,
      receivable: 2700,
    });
  });

  it("金额四舍五入到分，忽略无名称的明细", () => {
    const result = courseChargeItems([
      {
        teeth: "11",
        lines: [
          {
            feeItemId: 5,
            name: "树脂充填",
            teeth: "",
            unitPrice: 0.1,
            quantity: 3,
          },
          {
            feeItemId: 6,
            name: "  ",
            teeth: "12",
            unitPrice: 100,
            quantity: 1,
          },
        ],
      },
    ]);
    expect(result.receivable).toBe(0.3);
    expect(result.items).toHaveLength(1);
    expect(result.unquotedCount).toBe(0);
  });

  it("折扣率按百分比折算单价与金额", () => {
    expect(
      courseChargeItems([
        {
          teeth: "11",
          lines: [
            {
              feeItemId: 7,
              name: "树脂充填",
              teeth: "",
              unitPrice: 300,
              quantity: 1,
              discountPercent: (200 / 300) * 100,
            },
          ],
        },
      ]),
    ).toEqual({
      items: [
        {
          feeItemId: 7,
          name: "树脂充填",
          teeth: "11",
          unitPrice: 200,
          quantity: 1,
          amount: 200,
        },
      ],
      unquotedCount: 0,
      receivable: 200,
    });
  });
});
