import {
  isOrthoRecordType,
  type MedicalRecordType,
} from "../medical-records/record-rules";
import { ORTHO_VISIT_REMARK } from "../visits/visit-options";

export type TodayVisitSource = {
  id: number;
  patientId: number;
  startTime: string;
  endTime: string;
  kind: string;
  status: string;
  doctor: string;
  remark: string;
  visitId: number | null;
  source: string;
  patient: { name: string; phone: string; chartNo: string };
  /** 该次就诊挂的病历（id 倒序，第一条最新） */
  visit: { medicalRecords: { type: string; doctor: string }[] } | null;
};

export type TodayVisitRow = {
  key: string;
  kind: "clinic" | "orthodontics" | "implant";
  patientId: number;
  name: string;
  phone: string;
  chartNo: string;
  detail: string;
  startTime: string;
  endTime: string;
  status: string;
  /** 已开始接诊（已生成 Visit，状态仍是 booked） */
  started: boolean;
  staff: string;
  /** 种植就诊的牙位（FDI 原文），用于十字展示 */
  teeth?: string[];
};

export function isOrthoVisit(row: {
  remark: string;
  visit: { medicalRecords: { type: string }[] } | null;
}): boolean {
  if (row.remark === ORTHO_VISIT_REMARK) return true;
  return (row.visit?.medicalRecords ?? []).some((r) =>
    isOrthoRecordType(r.type as MedicalRecordType),
  );
}

/**
 * 一次就诊只出一行：挂了正畸病历、或在正畸名单点过「就诊」的就算正畸，
 * 避免和正畸档案的「上次就诊」重复列出。
 */
export function todayVisitRow(
  row: TodayVisitSource,
  teeth?: string[],
): TodayVisitRow {
  const medicalRecords = row.visit?.medicalRecords ?? [];
  const orthoRecord = medicalRecords.find((r) =>
    isOrthoRecordType(r.type as MedicalRecordType),
  );
  const latestRecord = medicalRecords[0];
  const ortho = isOrthoVisit(row);
  const staffSource = ortho ? (orthoRecord ?? latestRecord) : undefined;
  const common = {
    patientId: row.patientId,
    name: row.patient.name,
    phone: row.patient.phone,
    chartNo: row.patient.chartNo,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    started: row.visitId != null,
    staff: staffSource?.doctor || row.doctor,
  };
  // 种植记录保存时生成的就诊（source = implant）出一行种植，内容列用牙位十字
  if (row.source === "implant") {
    return {
      ...common,
      key: `implant-${row.id}`,
      kind: "implant",
      detail: "",
      teeth: teeth ?? [],
    };
  }
  return ortho
    ? {
        ...common,
        key: `orthodontics-${row.id}`,
        kind: "orthodontics",
        detail: orthoRecord?.type ?? latestRecord?.type ?? "visited",
      }
    : {
        ...common,
        key: `clinic-${row.id}`,
        kind: "clinic",
        detail: row.kind,
      };
}
