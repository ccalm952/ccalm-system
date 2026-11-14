import type { FollowUpStatus, FollowUpType } from "./options";

export type FollowUp = {
  id: number;
  patientId: number;
  name: string;
  phone: string;
  chartNo: string;
  type: FollowUpType;
  planDate: string;
  content: string;
  doctor: string;
  status: FollowUpStatus;
  result: string;
  satisfaction: string;
  completedAt: string | null;
  /** 是否已到计划日期（含逾期）且还没随访 */
  due: boolean;
};
