export type VisitKind = "first" | "return";
/**
 * 就诊/预约状态（与后端 VISIT_STATUSES 一致，只有 4 个）：
 * booked 预约 | completed 治疗完成 | missed 已失约 | cancelled 已取消
 * 「已到店」不是状态，是 arrivedAt 时间戳。
 */
export type VisitStatus = "booked" | "completed" | "missed" | "cancelled";

export const VISIT_KIND_OPTIONS: { value: VisitKind; label: string }[] = [
  { value: "first", label: "初诊" },
  { value: "return", label: "复诊" },
];

export const VISIT_STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
  { value: "booked", label: "预约" },
  { value: "completed", label: "治疗完成" },
  { value: "missed", label: "已失约" },
  { value: "cancelled", label: "已取消" },
];

export function visitKindLabel(kind: VisitKind): string {
  return VISIT_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

export function visitStatusLabel(status: VisitStatus): string {
  return VISIT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

/** 状态 + 是否到店合成一个展示文案：预约 + 已到店 = 已到店 */
export function visitDisplayStatusLabel(
  status: VisitStatus,
  arrived: boolean,
): string {
  if (status === "booked" && arrived) return "已到店";
  return visitStatusLabel(status);
}

export function visitTimeRange(startTime: string, endTime: string): string {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime;
}
