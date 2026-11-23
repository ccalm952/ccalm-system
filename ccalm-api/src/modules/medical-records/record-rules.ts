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

/** 病历正文里的半角逗号统一成全角 */
export function toFullWidthComma(s: string): string {
  return s.replace(/,/g, "，");
}

/**
 * 牙位号串：整段都是两位 FDI 时去重排序后半角逗号拼接；否则当自由文本原样返回。
 * 只认半角逗号分隔（旧空格/顿号等靠迁移脚本改库）。
 */
export function normalizeTeethFdiString(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const parts = s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  if (!parts.every((p) => /^\d{2}$/.test(p))) return s;
  return [...new Set(parts)].sort((a, b) => Number(a) - Number(b)).join(",");
}

/** 明细牙位须为组牙位子集（空明细牙位表示整组） */
export function isTeethSubsetOfGroup(
  lineTeeth: string,
  groupTeeth: string,
): boolean {
  if (!lineTeeth) return true;
  const group = new Set(
    groupTeeth
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
  );
  return lineTeeth
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .every((t) => group.has(t));
}

/** 报价数量默认取牙位颗数（半角逗号分隔的两位 FDI），否则 1 */
export function defaultPlanQuantity(teeth: string): number {
  const s = teeth.trim();
  if (!s) return 1;
  const parts = s
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length || !parts.every((p) => /^\d{2}$/.test(p))) return 1;
  return new Set(parts).size;
}

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
  first: FIRST_FIELDS,
  orthoFirst: FIRST_FIELDS,
  return: RETURN_FIELDS.filter((f) => f !== "oralExam"),
  orthoReturn: RETURN_FIELDS,
};

export function normalizeToothEntries(raw: unknown): ToothEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e: { teeth?: unknown; text?: unknown }) => ({
      teeth:
        typeof e?.teeth === "string" ? normalizeTeethFdiString(e.teeth) : "",
      text: typeof e?.text === "string" ? toFullWidthComma(e.text.trim()) : "",
    }))
    .filter((e) => e.teeth || e.text);
}

export type PlanLineInput = {
  id: number | null;
  feeItemId: number | null;
  name: string;
  teeth: string;
  unitPrice: number | null;
  quantity: number | null;
  /** 折扣率（%），null 表示 100 */
  discountPercent: number | null;
};

export type PlanItemInput = {
  id: number | null;
  teeth: string;
  lines: PlanLineInput[];
};

function normalizeDiscountPercent(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (raw < 0 || raw > 100) return null;
  return raw;
}

function normalizePlanLine(
  e: {
    id?: unknown;
    feeItemId?: unknown;
    name?: unknown;
    teeth?: unknown;
    unitPrice?: unknown;
    quantity?: unknown;
    discountPercent?: unknown;
  },
  groupTeeth: string,
): PlanLineInput | null {
  const name =
    typeof e?.name === "string" ? toFullWidthComma(e.name.trim()) : "";
  const feeItemId = Number.isInteger(e?.feeItemId)
    ? (e.feeItemId as number)
    : null;
  if (!name && feeItemId == null) return null;
  const teeth =
    typeof e?.teeth === "string" ? normalizeTeethFdiString(e.teeth) : "";
  if (!isTeethSubsetOfGroup(teeth, groupTeeth)) return null;
  const unitPrice =
    typeof e?.unitPrice === "number" && e.unitPrice >= 0 ? e.unitPrice : null;
  const qtyTeeth = teeth || groupTeeth;
  const quantity =
    Number.isInteger(e?.quantity) && (e.quantity as number) > 0
      ? (e.quantity as number)
      : null;
  return {
    id: Number.isInteger(e?.id) ? (e.id as number) : null,
    feeItemId,
    name,
    teeth,
    unitPrice,
    quantity:
      unitPrice == null ? null : (quantity ?? defaultPlanQuantity(qtyTeeth)),
    discountPercent:
      unitPrice == null ? null : normalizeDiscountPercent(e?.discountPercent),
  };
}

/** 治疗计划组：牙位 + 收费明细；丢掉无牙位且无明细的空组 */
export function normalizePlanItems(raw: unknown): PlanItemInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e: { id?: unknown; teeth?: unknown; lines?: unknown }) => {
      const teeth =
        typeof e?.teeth === "string" ? normalizeTeethFdiString(e.teeth) : "";
      const rawLines = Array.isArray(e?.lines) ? e.lines : [];
      const lines = rawLines
        .map((line: unknown) =>
          normalizePlanLine(
            line && typeof line === "object"
              ? (line as Parameters<typeof normalizePlanLine>[0])
              : {},
            teeth,
          ),
        )
        .filter((line): line is PlanLineInput => line != null);
      return {
        id: Number.isInteger(e?.id) ? (e.id as number) : null,
        teeth,
        lines,
      };
    })
    .filter((e) => e.teeth || e.lines.length);
}

/** 组展示名：明细名称用全角逗号拼接 */
export function planGroupLabel(lines: { name: string }[]): string {
  return lines
    .map((l) => l.name.trim())
    .filter(Boolean)
    .join("，");
}

/** 有复诊勾了「本行已完成」即该组完成；返回最近一次完成的日期 */
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

/** 与前端 lib/medical-records/record-types.ts 一致：计划组全部完成才算治疗完成；未完成且已终止的不再待完成 */
export function planCourseStatus(
  items: { doneDate: string | null }[],
  planStoppedAt: string | null,
): PlanCourseStatus {
  if (!items.length) return "none";
  if (items.every((i) => i.doneDate)) return "done";
  return planStoppedAt ? "stopped" : "pending";
}

export type PlanLinkInput = { planItemId: number; completes: boolean };

/** 同一组重复出现时合并，任一勾了完成即完成 */
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
    content[f] =
      fields.has(f) && typeof v === "string" ? toFullWidthComma(v.trim()) : "";
  }
  for (const f of RECORD_JSON_ENTRY_FIELDS) {
    content[f] = fields.has(f) ? normalizeToothEntries(raw[f]) : [];
  }
  return content;
}
