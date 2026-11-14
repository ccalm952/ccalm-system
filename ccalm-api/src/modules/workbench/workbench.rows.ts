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
  patient: { name: string; phone: string; chartNo: string };
  /** 该次就诊挂的病历（id 倒序，第一条最新） */
  medicalRecords: { type: string; doctor: string }[];
};

export type TodayVisitRow = {
  key: string;
  kind: "clinic" | "orthodontics";
  patientId: number;
  name: string;
  phone: string;
  chartNo: string;
  detail: string;
  startTime: string;
  endTime: string;
  status: string;
  staff: string;
};

export function isOrthoVisit(row: {
  remark: string;
  medicalRecords: { type: string }[];
}): boolean {
  if (row.remark === ORTHO_VISIT_REMARK) return true;
  return row.medicalRecords.some((r) =>
    isOrthoRecordType(r.type as MedicalRecordType),
  );
}

/**
 * 一次就诊只出一行：挂了正畸病历、或在正畸名单点过「就诊」的就算正畸，
 * 避免和正畸档案的「上次就诊」重复列出。
 */
export function todayVisitRow(row: TodayVisitSource): TodayVisitRow {
  const orthoRecord = row.medicalRecords.find((r) =>
    isOrthoRecordType(r.type as MedicalRecordType),
  );
  const latestRecord = row.medicalRecords[0];
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
    staff: staffSource?.doctor || row.doctor,
  };
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
