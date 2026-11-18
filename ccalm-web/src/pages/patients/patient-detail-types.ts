import type { ChargeState } from "@/lib/charges/charge-calc";
import type {
  MedicalRecordType,
  PlanItem,
  ToothEntry,
} from "@/lib/medical-records/record-types";
import type { OrthodonticsCategory } from "@/lib/orthodontics/categories";
import type { VisitKind, VisitStatus } from "@/lib/visits/visit-options";
import type { PatientFormValue } from "./patient-form-dialog";

export type PatientDetail = PatientFormValue & {
  id: number;
  age: number | null;
  createdAt: string;
  implantVisits: {
    id: number;
    visitDate: string;
    remark: string | null;
    staff: string | null;
    teeth: {
      id: number;
      toothNo: string | null;
      implantBrand: string | null;
      implantModel: string | null;
      toothRemark: string | null;
    }[];
  }[];
  pendings: {
    id: number;
    teeth: string;
    extractionDate: string | null;
    remark: string;
  }[];
  orthodontics: {
    id: number;
    category: OrthodonticsCategory;
    applianceModel: string;
    lastVisitDate: string | null;
    daysSinceLastVisit: number | null;
    remark: string;
    doctor: string;
  }[];
};

export type PatientVisit = {
  id: number;
  patientId: number;
  visitDate: string;
  startTime: string;
  endTime: string;
  kind: VisitKind;
  status: VisitStatus;
  doctor: string;
  remark: string;
  medicalRecordIds: number[];
  chargeOrderIds: number[];
  /** 该就诊收款合计 */
  paidAmount?: number;
  /** 初诊治疗收费单：应收/已收/欠费 */
  receivable?: number | null;
  coursePaid?: number | null;
  owed?: number | null;
  /** 关联的预约；有值表示已开始接诊 */
  appointmentId?: number | null;
};

export type MedicalRecord = {
  id: number;
  patientId: number;
  visitId: number | null;
  type: MedicalRecordType;
  visitDate: string;
  visitTime: string;
  doctor: string;
  nurse: string;
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  oralExam: ToothEntry[];
  auxiliaryExam: string;
  diagnosis: ToothEntry[];
  treatmentPlan: PlanItem[];
  treatment: ToothEntry[];
  advice: string;
  remark: string;
  planStoppedAt: string | null;
  planLinks: PlanLink[];
  updatedAt: string;
};

export type PlanLink = ToothEntry & { planItemId: number; completes: boolean };

export type ChargeOrder = {
  id: number;
  patientId: number;
  visitId: number | null;
  isCourse: boolean;
  chargeDate: string;
  doctor: string;
  status: "normal" | "void";
  state: ChargeState;
  receivable: number;
  paid: number;
  owed: number;
  remark: string;
  items: {
    id: number;
    feeItemId: number | null;
    name: string;
    teeth: string;
    unitPrice: number;
    quantity: number;
    amount: number;
  }[];
  payments: {
    id: number;
    amount: number;
    method: string;
    doctor: string;
    paidAt: string;
    visitId: number | null;
    visitDate: string | null;
    visitKind: VisitKind | null;
  }[];
};

export type ChargesResponse = {
  summary: { receivable: number; paid: number; owed: number };
  orders: ChargeOrder[];
};

export type CourseChargeResult = {
  order: ChargeOrder;
  unquotedCount: number;
};

export type PatientTab = "info" | "visits" | "records" | "followUp" | "charges";
