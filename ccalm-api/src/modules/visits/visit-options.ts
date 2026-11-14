export const VISIT_KINDS = ["first", "return"] as const;
export type VisitKind = (typeof VISIT_KINDS)[number];

export const VISIT_STATUSES = [
  "booked",
  "arrived",
  "completed",
  "cancelled",
  "missed",
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

/** 初诊 / 正畸初诊病历自动建的就诊算初诊，其余算复诊 */
export function visitKindForRecordType(type: string): VisitKind {
  return type === "first" || type === "orthoFirst" ? "first" : "return";
}

/** 正畸名单点「就诊」建的就诊备注；工作台据此把这次就诊归为正畸 */
export const ORTHO_VISIT_REMARK = "正畸就诊";
