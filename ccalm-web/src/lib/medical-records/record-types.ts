import { chargeItemAmount } from "@/lib/charges/charge-calc";
import { parseTeethStrict } from "@/lib/tooth-fdi";

export type MedicalRecordType =
  "first" | "return" | "orthoFirst" | "orthoReturn";

export type ToothEntry = { teeth: string; text: string };

/** 治疗计划行；新加的行还没有 id */
export type PlanItem = ToothEntry & {
  id?: number;
  /** 报价单价；未报价为 null */
  unitPrice?: number | null;
  quantity?: number | null;
  discountNote?: string;
  followUpCount?: number;
  doneDate?: string | null;
};

export type PlanCourseStatus = "none" | "pending" | "done" | "stopped";

/** 与后端 modules/medical-records/record-rules.ts 一致：计划行全部完成才算疗程完成；未完成且已终止的不再待完成 */
export function planCourseStatus(
  items: { doneDate?: string | null }[],
  planStoppedAt: string | null,
): PlanCourseStatus {
  if (!items.length) return "none";
  if (items.every((i) => i.doneDate)) return "done";
  return planStoppedAt ? "stopped" : "pending";
}

export type MedicalRecordTextField =
  | "chiefComplaint"
  | "presentIllness"
  | "pastHistory"
  | "auxiliaryExam"
  | "advice"
  | "remark";
export type MedicalRecordEntryField =
  "oralExam" | "diagnosis" | "treatmentPlan" | "treatment";
export type MedicalRecordField =
  MedicalRecordTextField | MedicalRecordEntryField;

export const MEDICAL_RECORD_TYPE_OPTIONS: {
  value: MedicalRecordType;
  label: string;
}[] = [
  { value: "first", label: "初诊病历" },
  { value: "return", label: "复诊病历" },
  { value: "orthoFirst", label: "正畸初诊病历" },
  { value: "orthoReturn", label: "正畸复诊病历" },
];

export function medicalRecordTypeLabel(type: MedicalRecordType): string {
  return (
    MEDICAL_RECORD_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
  );
}

export const MEDICAL_RECORD_FIELD_LABELS: Record<MedicalRecordField, string> = {
  chiefComplaint: "主诉",
  presentIllness: "现病史",
  pastHistory: "既往史",
  oralExam: "口腔检查",
  auxiliaryExam: "辅助检查",
  diagnosis: "诊断",
  treatmentPlan: "治疗计划",
  treatment: "处置",
  advice: "医嘱",
  remark: "备注",
};

export const MEDICAL_RECORD_ENTRY_FIELDS: MedicalRecordEntryField[] = [
  "oralExam",
  "diagnosis",
  "treatmentPlan",
  "treatment",
];

const FIRST_FIELDS: MedicalRecordField[] = [
  "chiefComplaint",
  "presentIllness",
  "pastHistory",
  "oralExam",
  "auxiliaryExam",
  "diagnosis",
  "treatmentPlan",
  "treatment",
  "advice",
  "remark",
];
const RETURN_FIELDS: MedicalRecordField[] = [
  "oralExam",
  "treatment",
  "advice",
  "remark",
];

/** 与后端 modules/medical-records/record-rules.ts 一致：各病历类型显示/保存的字段 */
export const MEDICAL_RECORD_FIELDS: Record<
  MedicalRecordType,
  MedicalRecordField[]
> = {
  first: FIRST_FIELDS.filter((f) => f !== "treatment"),
  orthoFirst: FIRST_FIELDS,
  return: RETURN_FIELDS.filter((f) => f !== "oralExam"),
  orthoReturn: RETURN_FIELDS,
};

export function isEntryField(
  field: MedicalRecordField,
): field is MedicalRecordEntryField {
  return (MEDICAL_RECORD_ENTRY_FIELDS as string[]).includes(field);
}

export function hasTreatment(entries: ToothEntry[]): boolean {
  return entries.some((e) => e.text.trim() !== "");
}

export function cleanToothEntries(entries: ToothEntry[]): ToothEntry[] {
  return entries
    .map((e) => ({ teeth: e.teeth.trim(), text: e.text.trim() }))
    .filter((e) => e.teeth || e.text);
}

/** 报价数量默认取牙位颗数，无牙位时为 1 */
export function defaultPlanQuantity(teeth: string): number {
  return parseTeethStrict(teeth)?.length || 1;
}

export function planItemAmount(item: PlanItem): number | null {
  if (item.unitPrice == null) return null;
  return chargeItemAmount(
    item.unitPrice,
    item.quantity ?? defaultPlanQuantity(item.teeth),
  );
}

/** 同 cleanToothEntries，但保留已有行的 id，复诊关联才不会丢；有单价时补齐数量 */
export function cleanPlanItems(items: PlanItem[]): {
  id?: number;
  teeth: string;
  text: string;
  unitPrice: number | null;
  quantity: number | null;
  discountNote: string;
}[] {
  return items
    .map((e) => {
      const teeth = e.teeth.trim();
      const unitPrice = e.unitPrice ?? null;
      return {
        id: e.id,
        teeth,
        text: e.text.trim(),
        unitPrice,
        quantity:
          unitPrice == null ? null : (e.quantity ?? defaultPlanQuantity(teeth)),
        discountNote: unitPrice == null ? "" : (e.discountNote ?? "").trim(),
      };
    })
    .filter((e) => e.teeth || e.text);
}
