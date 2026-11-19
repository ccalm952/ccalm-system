/** 预约（就诊）状态：只有 4 个，见 visits/visit-options.ts */
export const APPOINTMENT_STATUSES = ["booked", "completed", "missed"] as const;

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  booked: "预约",
  completed: "治疗完成",
  missed: "已失约",
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
  "implant",
] as const;

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * 看板展示用的医生：有就诊记录就以就诊记录为准（那是实际接诊），
 * 没有就诊记录才退回预约上排的医生。历史数据里两者经常会不一致。
 */
export function displayDoctor(
  appointmentDoctor: string,
  visitDoctor?: string | null,
): string {
  return (visitDoctor ?? "").trim() || appointmentDoctor;
}

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

/** 预约时长校验：15 的倍数，且在 15–120 分钟之间 */
export function slotDurationError(
  startTime: string,
  endTime: string,
): string | null {
  const duration = toMinutes(endTime) - toMinutes(startTime);
  if (!Number.isFinite(duration) || duration < 15 || duration > 120) {
    return "预约时长需为 15 分钟的整数倍，且在 15–120 分钟之间";
  }
  if (duration % 15 !== 0) {
    return "预约时长需为 15 分钟的整数倍，且在 15–120 分钟之间";
  }
  return null;
}
