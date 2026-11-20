import { chargeItemAmount, sumMoney } from "@/lib/charges/charge-calc";
import { parseTeethStrict } from "@/lib/tooth-fdi";

export type MedicalRecordType =
  "first" | "return" | "orthoFirst" | "orthoReturn";

export type ToothEntry = { teeth: string; text: string };

/** 计划组内收费明细 */
export type PlanLine = {
  id?: number;
  feeItemId: number | null;
  name: string;
  /** 组牙位子集；空表示整组 */
  teeth: string;
  unitPrice?: number | null;
  quantity?: number | null;
  discountNote?: string;
};

/** 治疗计划组（完成/复诊单元）；text 为明细名拼接，便于只读展示 */
export type PlanItem = {
  id?: number;
  teeth: string;
  text: string;
  lines: PlanLine[];
  followUpCount?: number;
  doneDate?: string | null;
};

export type PlanCourseStatus = "none" | "pending" | "done" | "stopped";

/** 与后端 modules/medical-records/record-rules.ts 一致：计划组全部完成才算治疗完成；未完成且已终止的不再待完成 */
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
  first: FIRST_FIELDS,
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

export function planLineAmount(
  line: PlanLine,
  groupTeeth: string,
): number | null {
  if (line.unitPrice == null) return null;
  const teeth = line.teeth.trim() || groupTeeth;
  return chargeItemAmount(
    line.unitPrice,
    line.quantity ?? defaultPlanQuantity(teeth),
  );
}

/** 组金额 = 已报价明细合计；全无报价返回 null */
export function planItemAmount(item: PlanItem): number | null {
  const amounts = item.lines
    .map((line) => planLineAmount(line, item.teeth))
    .filter((v): v is number => v != null);
  if (!amounts.length) return null;
  return sumMoney(amounts);
}

export function planGroupLabel(lines: { name: string }[]): string {
  return lines
    .map((l) => l.name.trim())
    .filter(Boolean)
    .join("，");
}

/** 清洗计划组与明细；有单价时补齐数量；丢掉空组 */
export function cleanPlanItems(items: PlanItem[]): {
  id?: number;
  teeth: string;
  lines: {
    id?: number;
    feeItemId: number | null;
    name: string;
    teeth: string;
    unitPrice: number | null;
    quantity: number | null;
    discountNote: string;
  }[];
}[] {
  return items
    .map((g) => {
      const teeth = g.teeth.trim();
      const lines = g.lines
        .map((line) => {
          const name = line.name.trim();
          const feeItemId = line.feeItemId ?? null;
          if (!name && feeItemId == null) return null;
          const lineTeeth = line.teeth.trim();
          const unitPrice = line.unitPrice ?? null;
          const qtyTeeth = lineTeeth || teeth;
          return {
            id: line.id,
            feeItemId,
            name,
            teeth: lineTeeth,
            unitPrice,
            quantity:
              unitPrice == null
                ? null
                : (line.quantity ?? defaultPlanQuantity(qtyTeeth)),
            discountNote:
              unitPrice == null ? "" : (line.discountNote ?? "").trim(),
          };
        })
        .filter((l): l is NonNullable<typeof l> => l != null);
      return { id: g.id, teeth, lines };
    })
    .filter((g) => g.teeth || g.lines.length);
}
