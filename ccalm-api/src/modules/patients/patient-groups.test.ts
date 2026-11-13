import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import {
  dormantCutoff,
  latestVisitDate,
  normalizeTags,
  parsePatientGroup,
  patientGroupWhere,
} from "./patient-groups";

describe("patientGroupWhere", () => {
  it("重复患者分组按重名姓名筛选", () => {
    expect(patientGroupWhere("duplicate", ["曾锦治", "柯金棍"])).toEqual({
      name: { in: ["曾锦治", "柯金棍"] },
    });
  });
});

describe("parsePatientGroup", () => {
  it("识别已知分组", () => {
    expect(parsePatientGroup("implant")).toBe("implant");
    expect(parsePatientGroup("dormant")).toBe("dormant");
  });

  it("未知或为空时回到全部", () => {
    expect(parsePatientGroup(undefined)).toBe("all");
    expect(parsePatientGroup("xxx")).toBe("all");
  });
});

describe("dormantCutoff", () => {
  it("往前推一年", () => {
    expect(dormantCutoff(dayjs("2026-11-12"))).toBe("2025-11-12");
  });
});

describe("latestVisitDate", () => {
  it("取最近的日期，忽略空值", () => {
    expect(latestVisitDate(["2026-01-02", null, "2026-03-01", ""])).toBe(
      "2026-03-01",
    );
  });

  it("全为空时返回 null", () => {
    expect(latestVisitDate([null, undefined])).toBeNull();
  });
});

describe("normalizeTags", () => {
  it("去空格、去空、去重", () => {
    expect(normalizeTags([" 正畸 ", "", "拔牙", "正畸"])).toEqual([
      "正畸",
      "拔牙",
    ]);
  });
});
