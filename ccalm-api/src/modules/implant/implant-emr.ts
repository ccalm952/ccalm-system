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
    .map((s) =>
      typeof s === "string" ? s.trim().replace(/,/g, "，") : "",
    )
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

/** 病历配台护士：用种植记录的 staff（人员） */
export function implantEmrNurse(staff?: string | null): string {
  return staff?.trim() ?? "";
}
