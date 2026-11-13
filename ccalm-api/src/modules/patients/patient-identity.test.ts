import { describe, expect, it } from "vitest";

import {
  normalizePatientIdentity,
  patientMatchWhere,
} from "./patient-identity";

describe("normalizePatientIdentity", () => {
  it("去掉首尾空格，空值变空串", () => {
    expect(
      normalizePatientIdentity({ name: " 张三 ", phone: null, chartNo: " 1 " }),
    ).toEqual({ name: "张三", phone: "", chartNo: "1" });
  });
});

describe("patientMatchWhere", () => {
  it("姓名 + 病历号或手机号", () => {
    expect(
      patientMatchWhere({ name: "张三", phone: "138", chartNo: "1001" }),
    ).toEqual({
      name: "张三",
      OR: [{ chartNo: "1001" }, { phone: "138" }],
    });
  });

  it("只有手机号时按姓名 + 手机号", () => {
    expect(
      patientMatchWhere({ name: "张三", phone: "138", chartNo: "" }),
    ).toEqual({ name: "张三", OR: [{ phone: "138" }] });
  });

  it("没有病历号也没有手机号时不匹配，避免同名合并", () => {
    expect(
      patientMatchWhere({ name: "张三", phone: "", chartNo: "" }),
    ).toBeNull();
  });

  it("没有姓名时不匹配", () => {
    expect(
      patientMatchWhere({ name: "", phone: "138", chartNo: "1001" }),
    ).toBeNull();
  });
});
