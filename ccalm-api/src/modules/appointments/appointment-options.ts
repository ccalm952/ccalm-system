/** 预约（就诊）状态：只有 4 个，见 visits/visit-options.ts */
export const APPOINTMENT_STATUSES = [
  "booked",
  "completed",
  "missed",
  "cancelled",
] as const;

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  booked: "预约",
  completed: "治疗完成",
  missed: "已失约",
  cancelled: "已取消",
};

/** 持续时间（分钟） */
export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;
export const DEFAULT_DURATION = 30;

/** 待定原因 */
export const PENDING_REASONS = [
  "patient_time",
  "doctor_schedule",
  "lab",
  "consult",
] as const;

export const PENDING_REASON_LABELS: Record<string, string> = {
  patient_time: "患者时间待定",
  doctor_schedule: "医生排班待定",
  lab: "加工件未到",
  consult: "需多医生会诊",
};

/** 预约来源 */
export const APPOINTMENT_SOURCES = [
  "manual",
  "network",
  "record",
  "system",
] as const;

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 两个时段是否重叠（HH:mm 定长字符串可直接比较；首尾相接不算重叠） */
export function hasOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart < bEnd && aEnd > bStart;
}
