export type FollowUpType = "postop" | "ortho" | "suture" | "review" | "other";

export const FOLLOW_UP_TYPE_OPTIONS: {
  value: FollowUpType;
  label: string;
}[] = [
  { value: "postop", label: "术后随访" },
  { value: "ortho", label: "正畸复诊" },
  { value: "suture", label: "拆线" },
  { value: "review", label: "复查" },
  { value: "other", label: "其他" },
];

export function followUpTypeLabel(type: string): string {
  return FOLLOW_UP_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export type FollowUpStatus = "pending" | "done" | "cancelled";

export const FOLLOW_UP_STATUS_OPTIONS: {
  value: FollowUpStatus;
  label: string;
}[] = [
  { value: "pending", label: "待随访" },
  { value: "done", label: "已随访" },
  { value: "cancelled", label: "已取消" },
];

export function followUpStatusLabel(status: string): string {
  return (
    FOLLOW_UP_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  );
}

export const FOLLOW_UP_SATISFACTION_OPTIONS: {
  value: string;
  label: string;
}[] = [
  { value: "satisfied", label: "满意" },
  { value: "neutral", label: "一般" },
  { value: "unsatisfied", label: "不满意" },
];

export function followUpSatisfactionLabel(value: string): string {
  return (
    FOLLOW_UP_SATISFACTION_OPTIONS.find((o) => o.value === value)?.label ?? ""
  );
}
