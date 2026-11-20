import { describe, expect, it } from "vitest";

import {
  buildImplantTreatmentEntries,
  formatImplantTreatmentLine,
  implantEmrDoctor,
  implantEmrNurse,
  matchPlanItemForImplant,
  IMPLANT_EMR_DOCTOR_FALLBACK,
} from "./implant-emr";

describe("formatImplantTreatmentLine", () => {
  it("全角逗号拼接四段", () => {
    expect(
      formatImplantTreatmentLine({
        toothNo: "14",
        implantBrand: "Osstem",
        implantModel: "4010",
        toothRemark: "507R+植骨",
      }),
    ).toBe("14，Osstem，4010，507R+植骨");
  });

  it("跳过空段，段内半角逗号改全角", () => {
    expect(
      formatImplantTreatmentLine({
        toothNo: "44",
        implantBrand: "Osstem",
        implantModel: "4010",
        toothRemark: "",
      }),
    ).toBe("44，Osstem，4010");
    expect(
      formatImplantTreatmentLine({
        toothNo: "17",
        implantBrand: null,
        implantModel: "6006",
        toothRemark: "内提+覆盖",
      }),
    ).toBe("17，6006，内提+覆盖");
    expect(
      formatImplantTreatmentLine({
        toothNo: "14",
        implantBrand: "Osstem",
        implantModel: "3508",
        toothRemark: "测试,备注",
      }),
    ).toBe("14，Osstem，3508，测试，备注");
  });

  it("全空返回 null", () => {
    expect(
      formatImplantTreatmentLine({
        toothNo: "  ",
        implantBrand: null,
        implantModel: "",
        toothRemark: undefined,
      }),
    ).toBeNull();
  });
});

describe("buildImplantTreatmentEntries", () => {
  it("合并为一条处置：牙位空格串，正文换行", () => {
    expect(
      buildImplantTreatmentEntries([
        {
          toothNo: "14",
          implantBrand: "Osstem",
          implantModel: "4010",
          toothRemark: "507R+植骨",
        },
        {
          toothNo: "15",
          implantBrand: "Osstem",
          implantModel: "4508",
          toothRemark: "507R+植骨",
        },
      ]),
    ).toEqual([
      {
        teeth: "14,15",
        text: "14，Osstem，4010，507R+植骨\n15，Osstem，4508，507R+植骨",
      },
    ]);
  });

  it("无牙位号的行跳过", () => {
    expect(
      buildImplantTreatmentEntries([
        {
          toothNo: "",
          implantBrand: "Osstem",
          implantModel: "4010",
          toothRemark: "x",
        },
        {
          toothNo: "47",
          implantBrand: "Osstem",
          implantModel: "5008",
          toothRemark: "507R",
        },
      ]),
    ).toEqual([{ teeth: "47", text: "47，Osstem，5008，507R" }]);
  });
});

describe("matchPlanItemForImplant", () => {
  const plans = [
    { id: 51, teeth: "24,25,26,27", text: "种植" },
    { id: 53, teeth: "14,15,16,17", text: "种植+烤瓷" },
  ];

  it("按牙位重叠挂到对应计划组", () => {
    expect(matchPlanItemForImplant(["14", "15", "17"], plans)).toBe(53);
    expect(matchPlanItemForImplant(["24", "25"], plans)).toBe(51);
  });

  it("无重叠不挂", () => {
    expect(matchPlanItemForImplant(["36"], plans)).toBeNull();
    expect(matchPlanItemForImplant([], plans)).toBeNull();
  });
});

describe("implantEmrDoctor", () => {
  it("用医生字段，不是配台人员", () => {
    expect(implantEmrDoctor("胡芊芊")).toBe("胡芊芊");
    expect(implantEmrDoctor("  ")).toBe(IMPLANT_EMR_DOCTOR_FALLBACK);
    expect(implantEmrDoctor(null)).toBe(IMPLANT_EMR_DOCTOR_FALLBACK);
  });
});

describe("implantEmrNurse", () => {
  it("人员映射为配台，旧分隔改全角逗号", () => {
    expect(implantEmrNurse("卢+许")).toBe("卢，许");
    expect(implantEmrNurse("陈美珍、卢彤")).toBe("陈美珍，卢彤");
    expect(implantEmrNurse(null)).toBe("");
  });
});
