import { roundMoney, sumMoney } from "@/lib/charges/charge-calc";
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
  /** 折扣率（%），空表示 100 */
  discountPercent?: number | null;
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

export function planLineQuantity(line: PlanLine, groupTeeth: string): number {
  const teeth = line.teeth.trim() || groupTeeth;
  return line.quantity ?? defaultPlanQuantity(teeth);
}

/** 标价小计（优惠前） */
export function planLineListAmount(
  line: PlanLine,
  groupTeeth: string,
): number | null {
  if (line.unitPrice == null) return null;
  return roundMoney(line.unitPrice * planLineQuantity(line, groupTeeth));
}

export function planLineAmount(
  line: PlanLine,
  groupTeeth: string,
): number | null {
  if (line.unitPrice == null) return null;
  const quantity = planLineQuantity(line, groupTeeth);
  const percent =
    line.discountPercent != null && Number.isFinite(line.discountPercent)
      ? line.discountPercent
      : 100;
  // 先算总价再四舍五入，保证「填金额 → 反算折扣 → 回算金额」能回到原值
  return roundMoney((line.unitPrice * quantity * percent) / 100);
}

/** 折后单价（展示用）；无报价返回 null */
export function planLineEffectiveUnitPrice(
  line: PlanLine,
  groupTeeth: string,
): number | null {
  const amount = planLineAmount(line, groupTeeth);
  if (amount == null) return null;
  const quantity = planLineQuantity(line, groupTeeth);
  if (!(quantity > 0)) return null;
  return roundMoney(amount / quantity);
}

export function planLineHasDiscount(
  line: PlanLine,
  groupTeeth: string,
): boolean {
  const list = planLineListAmount(line, groupTeeth);
  const amount = planLineAmount(line, groupTeeth);
  return list != null && amount != null && amount < list;
}

/** 由实收金额反算折扣率（%）；满额返回 null；超出标价按 100 */
export function discountPercentFromAmount(
  unitPrice: number,
  quantity: number,
  amount: number,
): number | null {
  if (
    !(unitPrice >= 0) ||
    !(quantity > 0) ||
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return null;
  }
  const list = unitPrice * quantity;
  if (!(list > 0)) return amount === 0 ? 0 : null;
  const percent = (amount / list) * 100;
  if (percent >= 100) return null;
  if (percent <= 0) return 0;
  return percent;
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
    discountPercent: number | null;
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
          const rawPercent = line.discountPercent;
          const discountPercent =
            unitPrice == null
              ? null
              : typeof rawPercent === "number" &&
                  Number.isFinite(rawPercent) &&
                  rawPercent >= 0 &&
                  rawPercent <= 100
                ? rawPercent
                : null;
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
            discountPercent,
          };
        })
        .filter((l): l is NonNullable<typeof l> => l != null);
      return { id: g.id, teeth, lines };
    })
    .filter((g) => g.teeth || g.lines.length);
}
