import { describe, expect, it } from "vitest";

import { todayVisitRow, type TodayVisitSource } from "./workbench.rows";

const patient = { name: "林雯馨", phone: "15359575597", chartNo: "260837" };

function visit(overrides: Partial<TodayVisitSource> = {}): TodayVisitSource {
  return {
    id: 1,
    patientId: 10,
    startTime: "10:30",
    endTime: "",
    kind: "return",
    status: "completed",
    doctor: "吴介尘",
    patient,
    medicalRecords: [],
    ...overrides,
  };
}

describe("todayVisitRow", () => {
  it("普通门诊就诊出一行门诊", () => {
    const row = todayVisitRow(visit());
    expect(row).toMatchObject({
      key: "clinic-1",
      kind: "clinic",
      detail: "return",
      staff: "吴介尘",
    });
  });

  it("同一次就诊挂了正畸复诊病历时只出一行正畸，不再重复门诊行", () => {
    const row = todayVisitRow(
      visit({ medicalRecords: [{ type: "orthoReturn", doctor: "胡" }] }),
    );
    expect(row).toMatchObject({
      key: "orthodontics-1",
      kind: "orthodontics",
      detail: "orthoReturn",
    });
  });

  it("正畸行的医生以病历为准", () => {
    const row = todayVisitRow(
      visit({
        doctor: "吴介尘",
        medicalRecords: [{ type: "orthoReturn", doctor: "胡" }],
      }),
    );
    expect(row.staff).toBe("胡");
  });

  it("病历没填医生时退回就诊医生", () => {
    const row = todayVisitRow(
      visit({
        doctor: "吴介尘",
        medicalRecords: [{ type: "orthoFirst", doctor: "" }],
      }),
    );
    expect(row.staff).toBe("吴介尘");
  });
});
