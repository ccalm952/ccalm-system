export const MEDICAL_RECORD_TYPES = [
  "first",
  "return",
  "orthoFirst",
  "orthoReturn",
] as const;
export type MedicalRecordType = (typeof MEDICAL_RECORD_TYPES)[number];

/** 只有正畸类病历算正畸就诊，会更新正畸档案的上次就诊 */
export function isOrthoRecordType(type: MedicalRecordType): boolean {
  return type === "orthoFirst" || type === "orthoReturn";
}

export type ToothEntry = { teeth: string; text: string };

export const MEDICAL_RECORD_TEXT_FIELDS = [
  "chiefComplaint",
  "presentIllness",
  "pastHistory",
  "auxiliaryExam",
  "advice",
  "remark",
] as const;
export const MEDICAL_RECORD_ENTRY_FIELDS = [
  "oralExam",
  "diagnosis",
  "treatmentPlan",
  "treatment",
] as const;

export type MedicalRecordField =
  | (typeof MEDICAL_RECORD_TEXT_FIELDS)[number]
  | (typeof MEDICAL_RECORD_ENTRY_FIELDS)[number];

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

/** 与前端 lib/medical-records/record-types.ts 一致：各病历类型显示/保存的字段 */
export const MEDICAL_RECORD_FIELDS: Record<
  MedicalRecordType,
  MedicalRecordField[]
> = {
  first: FIRST_FIELDS.filter((f) => f !== "treatment"),
  orthoFirst: FIRST_FIELDS,
  return: RETURN_FIELDS.filter((f) => f !== "oralExam"),
  orthoReturn: RETURN_FIELDS,
};

export function normalizeToothEntries(raw: unknown): ToothEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e: { teeth?: unknown; text?: unknown }) => ({
      teeth: typeof e?.teeth === "string" ? e.teeth.trim() : "",
      text: typeof e?.text === "string" ? e.text.trim() : "",
    }))
    .filter((e) => e.teeth || e.text);
}

export type PlanItemInput = ToothEntry & {
  id: number | null;
  unitPrice: number | null;
  quantity: number | null;
  discountNote: string;
};

/** 治疗计划行：同牙位条目规则，另保留已有行的 id 以便复诊关联不丢 */
export function normalizePlanItems(raw: unknown): PlanItemInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(
      (e: {
        id?: unknown;
        teeth?: unknown;
        text?: unknown;
        unitPrice?: unknown;
        quantity?: unknown;
        discountNote?: unknown;
      }) => ({
        id: Number.isInteger(e?.id) ? (e.id as number) : null,
        teeth: typeof e?.teeth === "string" ? e.teeth.trim() : "",
        text: typeof e?.text === "string" ? e.text.trim() : "",
        unitPrice:
          typeof e?.unitPrice === "number" && e.unitPrice >= 0
            ? e.unitPrice
            : null,
        quantity:
          Number.isInteger(e?.quantity) && (e.quantity as number) > 0
            ? (e.quantity as number)
            : null,
        discountNote:
          typeof e?.discountNote === "string" ? e.discountNote.trim() : "",
      }),
    )
    .filter((e) => e.teeth || e.text);
}

/** 有复诊勾了「本行已完成」即该行完成；返回最近一次完成的日期 */
export function planItemDoneDate(
  followUps: { visitDate: string; completes: boolean }[],
): string | null {
  const dates = followUps
    .filter((f) => f.completes)
    .map((f) => f.visitDate)
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}

export type PlanCourseStatus = "none" | "pending" | "done" | "stopped";

/** 与前端 lib/medical-records/record-types.ts 一致：计划行全部完成才算疗程完成；未完成且已终止的不再待完成 */
export function planCourseStatus(
  items: { doneDate: string | null }[],
  planStoppedAt: string | null,
): PlanCourseStatus {
  if (!items.length) return "none";
  if (items.every((i) => i.doneDate)) return "done";
  return planStoppedAt ? "stopped" : "pending";
}

export type PlanLinkInput = { planItemId: number; completes: boolean };

/** 同一行重复出现时合并，任一勾了完成即完成 */
export function normalizePlanLinks(links: PlanLinkInput[]): PlanLinkInput[] {
  const map = new Map<number, boolean>();
  for (const l of links) {
    map.set(l.planItemId, (map.get(l.planItemId) ?? false) || l.completes);
  }
  return [...map].map(([planItemId, completes]) => ({
    planItemId,
    completes,
  }));
}

export function hasTreatment(entries: ToothEntry[]): boolean {
  return entries.some((e) => e.text !== "");
}

/** 存在病历 JSON 列里的牙位字段；治疗计划单独存成计划行 */
const RECORD_JSON_ENTRY_FIELDS = [
  "oralExam",
  "diagnosis",
  "treatment",
] as const;

type RecordContent = Record<
  (typeof MEDICAL_RECORD_TEXT_FIELDS)[number],
  string
> &
  Record<(typeof RECORD_JSON_ENTRY_FIELDS)[number], ToothEntry[]>;

/** 只保留该类型有的字段，其余清空，避免切换类型后残留看不到的内容 */
export function pickRecordContent(
  type: MedicalRecordType,
  raw: Partial<Record<MedicalRecordField, unknown>>,
): RecordContent {
  const fields = new Set(MEDICAL_RECORD_FIELDS[type]);
  const content = {} as RecordContent;
  for (const f of MEDICAL_RECORD_TEXT_FIELDS) {
    const v = raw[f];
    content[f] = fields.has(f) && typeof v === "string" ? v.trim() : "";
  }
  for (const f of RECORD_JSON_ENTRY_FIELDS) {
    content[f] = fields.has(f) ? normalizeToothEntries(raw[f]) : [];
  }
  return content;
}
