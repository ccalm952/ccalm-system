export type VisitKind = "first" | "return";
export type VisitStatus =
  "booked" | "arrived" | "completed" | "cancelled" | "missed";

export const VISIT_KIND_OPTIONS: { value: VisitKind; label: string }[] = [
  { value: "first", label: "初诊" },
  { value: "return", label: "复诊" },
];

export const VISIT_STATUS_OPTIONS: { value: VisitStatus; label: string }[] = [
  { value: "booked", label: "已预约" },
  { value: "arrived", label: "已到店" },
  { value: "completed", label: "治疗完成" },
  { value: "cancelled", label: "已取消" },
  { value: "missed", label: "失约" },
];

export function visitKindLabel(kind: VisitKind): string {
  return VISIT_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
}

export function visitStatusLabel(status: VisitStatus): string {
  return VISIT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function visitTimeRange(startTime: string, endTime: string): string {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime;
}
