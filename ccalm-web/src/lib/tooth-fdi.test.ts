import { describe, expect, it } from "vitest";

import { formatTeeth, groupPalmerLabels, parseTeethStrict } from "./tooth-fdi";

describe("formatTeeth / parseTeethStrict", () => {
  it("保存与解析都只用半角逗号", () => {
    expect(formatTeeth([15, 14, 17])).toBe("14,15,17");
    expect(parseTeethStrict("14,15,17")).toEqual([14, 15, 17]);
    expect(parseTeethStrict("14 15 17")).toBeNull();
  });
});

describe("groupPalmerLabels", () => {
  it("左侧象限从外侧到中线，右侧从中线到外侧", () => {
    expect(
      groupPalmerLabels([11, 12, 13, 14, 15, 16, 21, 22, 23, 41, 42, 31]),
    ).toEqual({ UR: "654321", UL: "123", LR: "21", LL: "1" });
  });

  it("恒乳混合时左右镜像", () => {
    expect(groupPalmerLabels([16, 53, 26, 63])).toEqual({
      UR: "C6",
      UL: "6C",
      LR: "",
      LL: "",
    });
  });
});
