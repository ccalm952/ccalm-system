import { splitImplantStaffNames } from "./implant-staff";

/** 种植记录自动生成的病历备注，用于识别与覆盖 */
export const IMPLANT_EMR_REMARK = "从种植记录自动生成";

/** 自动病历医生兜底（未选医生时） */
export const IMPLANT_EMR_DOCTOR_FALLBACK = "种植";

export type ImplantToothFields = {
  toothNo?: string | null;
  implantBrand?: string | null;
  implantModel?: string | null;
  toothRemark?: string | null;
};

export type ToothEntry = { teeth: string; text: string };

export type ImplantPlanItemRef = {
  id: number;
  teeth: string;
  /** 计划组项目名拼接，用于正畸文案打分 */
  text: string;
};

const ORTHO_PLAN_RE = /正畸|矫正|矫治/;

function toothNumSet(value: string): Set<number> {
  return new Set(
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0),
  );
}

/**
 * 按种植牙位匹配初诊治疗计划组（与 e看牙导入打分同思路，处置文案固定为「种植」）。
 * 无重叠则返回 null，不强行挂第一行。
 */
export function matchPlanItemForImplant(
  implantToothNos: string[],
  planItems: ImplantPlanItemRef[],
): number | null {
  const cureTeeth = toothNumSet(implantToothNos.join(","));
  if (!cureTeeth.size || !planItems.length) return null;

  let best: { id: number; score: number; ortho: boolean } | null = null;
  for (const plan of planItems) {
    const planTeeth = toothNumSet(plan.teeth);
    const inter = [...planTeeth].filter((n) => cureTeeth.has(n)).length;
    const specificity = planTeeth.size ? inter / planTeeth.size : 0;
    const orthoPlan = ORTHO_PLAN_RE.test(plan.text);
    let score = 0;
    if (!orthoPlan && inter > 0 && specificity >= 0.5) {
      score += 40 + specificity * 30;
    }
    if (orthoPlan && inter > 0) {
      score += 20;
    }
    if (score <= 0) continue;
    if (
      !best ||
      score > best.score ||
      (score === best.score && best.ortho && !orthoPlan) ||
      (score === best.score && orthoPlan === best.ortho && plan.id < best.id)
    ) {
      best = { id: plan.id, score, ortho: orthoPlan };
    }
  }
  return best?.id ?? null;
}

/** 全角逗号拼接牙位/品牌/植体/备注，跳过空段；段内半角 , 也改成全角 */
export function formatImplantTreatmentLine(
  tooth: ImplantToothFields,
): string | null {
  const parts = [
    tooth.toothNo,
    tooth.implantBrand,
    tooth.implantModel,
    tooth.toothRemark,
  ]
    .map((s) => (typeof s === "string" ? s.trim().replace(/,/g, "，") : ""))
    .filter(Boolean);
  return parts.length ? parts.join("，") : null;
}

/**
 * 合并为一条处置：牙位图选中全部牙位，处置框内一行一颗牙。
 * 无牙位号的种植行跳过。
 */
export function buildImplantTreatmentEntries(
  teeth: ImplantToothFields[],
): ToothEntry[] {
  const lines: string[] = [];
  const toothNos: string[] = [];
  for (const tooth of teeth) {
    const toothNo = tooth.toothNo?.trim() ?? "";
    if (!toothNo) continue;
    const text = formatImplantTreatmentLine({ ...tooth, toothNo });
    if (!text) continue;
    toothNos.push(toothNo);
    lines.push(text);
  }
  if (!lines.length) return [];
  return [{ teeth: toothNos.join(","), text: lines.join("\n") }];
}

/** 病历医生：用种植记录的 doctor，不是配台人员 */
export function implantEmrDoctor(doctor?: string | null): string {
  const s = doctor?.trim() ?? "";
  return s || IMPLANT_EMR_DOCTOR_FALLBACK;
}

/** 病历配台：用种植记录的 staff；顿号等旧分隔统一成全角逗号 */
export function implantEmrNurse(staff?: string | null): string {
  return splitImplantStaffNames(staff).join("，");
}
