/** 正畸类病历的类型；挂在同一次就诊上时，这次就诊按正畸展示 */
export const TODAY_ORTHO_RECORD_TYPES = ["orthoFirst", "orthoReturn"] as const;

export type TodayVisitSource = {
  id: number;
  patientId: number;
  startTime: string;
  endTime: string;
  kind: string;
  status: string;
  doctor: string;
  patient: { name: string; phone: string; chartNo: string };
  /** 该次就诊挂的正畸病历（没有则为空） */
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

/** 一次就诊只出一行；挂了正畸病历就算正畸，避免和正畸档案的「上次就诊」重复列出 */
export function todayVisitRow(row: TodayVisitSource): TodayVisitRow {
  const ortho = row.medicalRecords[0];
  const common = {
    patientId: row.patientId,
    name: row.patient.name,
    phone: row.patient.phone,
    chartNo: row.patient.chartNo,
    startTime: row.startTime,
    endTime: row.endTime,
    status: row.status,
    staff: ortho?.doctor || row.doctor,
  };
  return ortho
    ? {
        ...common,
        key: `orthodontics-${row.id}`,
        kind: "orthodontics",
        detail: ortho.type,
      }
    : {
        ...common,
        key: `clinic-${row.id}`,
        kind: "clinic",
        detail: row.kind,
      };
}
