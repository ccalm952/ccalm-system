import { describe, expect, it } from "vitest";

import {
  countImplantStaffByName,
  splitImplantStaffNames,
} from "./implant-staff";

describe("splitImplantStaffNames", () => {
  it("按全角逗号拆分", () => {
    expect(splitImplantStaffNames("卢彤，许桦婧，陈美珍")).toEqual([
      "卢彤",
      "许桦婧",
      "陈美珍",
    ]);
  });

  it("兼容加号与顿号", () => {
    expect(splitImplantStaffNames("卢+许")).toEqual(["卢", "许"]);
    expect(splitImplantStaffNames("陈美珍、卢彤")).toEqual(["陈美珍", "卢彤"]);
  });

  it("空值返回空数组", () => {
    expect(splitImplantStaffNames(null)).toEqual([]);
    expect(splitImplantStaffNames("  ")).toEqual([]);
  });
});

describe("countImplantStaffByName", () => {
  it("一人一行累计次数", () => {
    expect(
      countImplantStaffByName([
        { staff: "卢，许，陈" },
        { staff: "卢，许，陈" },
        { staff: "陈，许" },
        { staff: "卢，陈，王" },
      ]),
    ).toEqual([
      { name: "陈", count: 4 },
      { name: "卢", count: 3 },
      { name: "许", count: 3 },
      { name: "王", count: 1 },
    ]);
  });

  it("全角逗号分隔的多人各记一次", () => {
    const rows = countImplantStaffByName([{ staff: "卢，许，陈" }]);
    expect(rows).toHaveLength(3);
    expect(Object.fromEntries(rows.map((r) => [r.name, r.count]))).toEqual({
      卢: 1,
      许: 1,
      陈: 1,
    });
  });
});
