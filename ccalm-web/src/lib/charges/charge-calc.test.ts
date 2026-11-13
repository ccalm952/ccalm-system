import { describe, expect, it } from "vitest";

import { chargeItemAmount, chargeState, sumMoney } from "./charge-calc";

describe("charge-calc", () => {
  it("明细金额 = 单价 × 数量，保留两位小数", () => {
    expect(chargeItemAmount(0.1, 3)).toBe(0.3);
    expect(chargeItemAmount(5000, 2)).toBe(10000);
  });

  it("合计避免浮点误差", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it("账单状态", () => {
    expect(chargeState("void", 100, 0)).toBe("void");
    expect(chargeState("normal", 100, 100)).toBe("settled");
    expect(chargeState("normal", 100, 40)).toBe("owing");
  });
});
