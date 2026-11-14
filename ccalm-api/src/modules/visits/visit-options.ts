export const VISIT_KINDS = ["first", "return"] as const;
export type VisitKind = (typeof VISIT_KINDS)[number];

/**
 * 就诊/预约状态（只有 4 个，2026-11 收敛）：
 * - booked    预约（未到店、已到店未治疗都停在这一档，"到店"用 arrivedAt 表达）
 * - completed 治疗完成（写病历触发，终态）
 * - missed    已失约
 * - cancelled 已取消
 */
export const VISIT_STATUSES = [
  "booked",
  "completed",
  "missed",
  "cancelled",
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

/** 仍可挂病历/收费的“开放就诊”：只剩预约 */
export const OPEN_VISIT_STATUSES: string[] = ["booked"];

/** 初诊 / 正畸初诊病历自动建的就诊算初诊，其余算复诊 */
export function visitKindForRecordType(type: string): VisitKind {
  return type === "first" || type === "orthoFirst" ? "first" : "return";
}

/** 正畸名单点「就诊」建的就诊备注；工作台据此把这次就诊归为正畸 */
export const ORTHO_VISIT_REMARK = "正畸就诊";
