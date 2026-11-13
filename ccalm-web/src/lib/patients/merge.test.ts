import { describe, expect, it } from "vitest";

import {
  defaultMergePicks,
  defaultMergeTarget,
  type MergeCandidate,
  mergedValues,
} from "./merge";

const counts = {
  clinicVisits: 0,
  medicalRecords: 0,
  chargeOrders: 0,
  implantVisits: 0,
  pendings: 0,
  orthodontics: 0,
};

function patient(p: Partial<MergeCandidate> & { id: number }): MergeCandidate {
  return {
    name: "曾锦治",
    phone: "",
    chartNo: "",
    gender: "",
    birthday: null,
    tags: [],
    remark: "",
    counts,
    ...p,
  };
}

describe("defaultMergeTarget", () => {
  it("记录最多的做保留档案", () => {
    const list = [
      patient({ id: 1 }),
      patient({ id: 2, counts: { ...counts, medicalRecords: 3 } }),
    ];
    expect(defaultMergeTarget(list)).toBe(2);
  });

  it("记录一样多时取 id 最小", () => {
    expect(defaultMergeTarget([patient({ id: 5 }), patient({ id: 3 })])).toBe(
      3,
    );
  });
});

describe("defaultMergePicks", () => {
  it("优先保留档案的值，为空时取其他患者的非空值", () => {
    const list = [
      patient({ id: 1, phone: "13800000000" }),
      patient({ id: 2, chartNo: "260510", tags: ["VIP"] }),
    ];
    expect(defaultMergePicks(list, 2)).toEqual({
      name: 2,
      gender: 2,
      phone: 1,
      chartNo: 2,
      birthday: 2,
      tags: 2,
      remark: 2,
    });
  });
});

describe("mergedValues", () => {
  it("按每个字段选定的来源取值", () => {
    const list = [
      patient({ id: 1, phone: "13800000000", birthday: "1980-01-01" }),
      patient({ id: 2, phone: "13900000000", remark: "过敏" }),
    ];
    const picks = { ...defaultMergePicks(list, 2), birthday: 1 };
    expect(mergedValues(list, picks)).toMatchObject({
      phone: "13900000000",
      birthday: "1980-01-01",
      remark: "过敏",
    });
  });
});
