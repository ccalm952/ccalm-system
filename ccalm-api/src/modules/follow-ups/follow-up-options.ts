export const FOLLOW_UP_TYPES = [
  "postop",
  "ortho",
  "suture",
  "review",
  "other",
] as const;
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

export const FOLLOW_UP_STATUSES = ["pending", "done", "cancelled"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const FOLLOW_UP_SATISFACTIONS = [
  "satisfied",
  "neutral",
  "unsatisfied",
] as const;

/** 待随访：还没执行、且计划日期不晚于今天（含逾期） */
export function isFollowUpDue(
  status: string,
  planDate: string,
  today: string,
): boolean {
  return status === "pending" && planDate <= today;
}
