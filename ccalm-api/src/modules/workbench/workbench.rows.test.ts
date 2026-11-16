import { describe, expect, it } from "vitest";

import { todayVisitRow, type TodayVisitSource } from "./workbench.rows";

const patient = { name: "林鑫棣", phone: "15359575597", chartNo: "260837" };

function visit(overrides: Partial<TodayVisitSource> = {}): TodayVisitSource {
  return {
    id: 1,
    patientId: 10,
    startTime: "10:30",
    endTime: "",
    kind: "return",
    status: "completed",
    doctor: "吴仲浩",
    remark: "",
    visitId: null,
    source: "booking",
    patient,
    visit: { medicalRecords: [] },
    ...overrides,
  };
}

const withRecords = (
  records: { type: string; doctor: string }[],
  overrides: Partial<TodayVisitSource> = {},
) => visit({ ...overrides, visit: { medicalRecords: records } });

describe("todayVisitRow", () => {
  it("普通门诊就诊出一行门诊", () => {
    const row = todayVisitRow(visit());
    expect(row).toMatchObject({
      key: "clinic-1",
      kind: "clinic",
      detail: "return",
      staff: "吴仲浩",
    });
  });

  it("同一次就诊挂了正畸复诊病历时只出一行正畸，不再重复门诊行", () => {
    const row = todayVisitRow(
      withRecords([{ type: "orthoReturn", doctor: "能" }]),
    );
    expect(row).toMatchObject({
      key: "orthodontics-1",
      kind: "orthodontics",
      detail: "orthoReturn",
    });
  });

  it("正畸行的医生以病历为准", () => {
    const row = todayVisitRow(
      withRecords([{ type: "orthoReturn", doctor: "能" }], {
        doctor: "吴仲浩",
      }),
    );
    expect(row.staff).toBe("能");
  });

  it("病历没填医生时退回就诊医生", () => {
    const row = todayVisitRow(
      withRecords([{ type: "orthoFirst", doctor: "" }], {
        doctor: "吴仲浩",
      }),
    );
    expect(row.staff).toBe("吴仲浩");
  });

  it("正畸名单点「就诊」建的即使还没写病历也算正畸", () => {
    const row = todayVisitRow(
      visit({
        status: "booked",
        visitId: 99,
        remark: "正畸就诊",
      }),
    );
    expect(row).toMatchObject({
      key: "orthodontics-1",
      kind: "orthodontics",
      detail: "visited",
      status: "booked",
      started: true,
    });
  });

  it("写完病历后仍是一行，内容换成病历类型", () => {
    const row = todayVisitRow(
      withRecords([{ type: "orthoReturn", doctor: "能" }], {
        remark: "正畸就诊",
      }),
    );
    expect(row).toMatchObject({
      key: "orthodontics-1",
      kind: "orthodontics",
      detail: "orthoReturn",
    });
  });

  it("正畸就诊后写的是普通复诊病历时，内容按普通复诊显示", () => {
    const row = todayVisitRow(
      withRecords([{ type: "return", doctor: "吴仲浩" }], {
        remark: "正畸就诊",
      }),
    );
    expect(row).toMatchObject({
      kind: "orthodontics",
      detail: "return",
      staff: "吴仲浩",
    });
  });

  it("普通门诊就诊挂了普通病历仍算门诊", () => {
    const row = todayVisitRow(
      withRecords([{ type: "return", doctor: "吴仲浩" }]),
    );
    expect(row.kind).toBe("clinic");
  });

  it("种植记录生成的预约出一行种植，牙位挂在行上", () => {
    const row = todayVisitRow(
      visit({ source: "implant", remark: "种植就诊" }),
      ["14", "15", "17"],
    );
    expect(row).toMatchObject({
      key: "implant-1",
      kind: "implant",
      detail: "",
      teeth: ["14", "15", "17"],
      status: "completed",
    });
  });
});
