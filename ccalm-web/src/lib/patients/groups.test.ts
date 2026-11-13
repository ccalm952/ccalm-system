import { describe, expect, it } from "vitest";

import { parseTagsInput } from "./groups";

describe("parseTagsInput", () => {
  it("按中英文逗号、顿号、空格拆分并去重", () => {
    expect(parseTagsInput(" 正畸，拔牙,正畸、 固定牙  ")).toEqual([
      "正畸",
      "拔牙",
      "固定牙",
    ]);
  });

  it("空输入返回空数组", () => {
    expect(parseTagsInput("  ")).toEqual([]);
  });
});
