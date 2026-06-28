export type AttendancePunchType = "morning_in" | "morning_out" | "afternoon_in" | "afternoon_out";

export type ScheduleRestType = "full_rest" | "morning_rest" | "afternoon_rest";

export const ATTENDANCE_PUNCH_TYPE_LABEL: Record<AttendancePunchType, string> = {
  morning_in: "上午上班",
  morning_out: "上午下班",
  afternoon_in: "下午上班",
  afternoon_out: "下午下班",
};

export type AttendanceRecord = {
  id: string;
  userId: string;
  userName: string;
  type: AttendancePunchType;
  punchTime: string; // ISO string
  latitude: number;
  longitude: number;
  address?: string;
  source?: "normal" | "makeup";
};

export type GeofenceConfig = {
  enabled: boolean;
  centerLat: number;
  centerLng: number;
  radiusM: number;
  label: string;
};

export type ShiftRange = {
  label: string;
  rangeStart: string; // HH:mm
  rangeEnd: string; // HH:mm
};

export type AttendanceShiftFullConfig = {
  morning: ShiftRange;
  afternoon: ShiftRange;
  morningInWindowStart: string; // HH:mm
  morningInWindowEnd: string; // HH:mm
  morningOutWindowStart: string; // HH:mm
  morningOutWindowEnd: string; // HH:mm
  afternoonInWindowStart: string; // HH:mm
  afternoonInWindowEnd: string; // HH:mm
  afternoonOutWindowStart: string; // HH:mm
  afternoonOutWindowEnd: string; // HH:mm
  overtimeMorningNormalEnd: string; // HH:mm
  overtimeAfternoonNormalEnd: string; // HH:mm
};

export type AttendancePunchDayRow = {
  date: string; // YYYY-MM-DD
  morningIn: string | null;
  morningOut: string | null;
  afternoonIn: string | null;
  afternoonOut: string | null;
  morningOutIsMakeup?: boolean;
  afternoonOutIsMakeup?: boolean;
  declaredRest?: ScheduleRestType | null;
  overtimeMinutes: number;
  overtimeStr: string;
};

export type AttendanceMakeupRequestStatus = "pending" | "approved" | "rejected";

export const ATTENDANCE_MAKEUP_REQUEST_STATUS_LABEL: Record<AttendanceMakeupRequestStatus, string> =
  {
    pending: "审批中",
    approved: "已通过",
    rejected: "已拒绝",
  };

export type AttendanceMakeupRequest = {
  id: string;
  userId: string;
  userName: string;
  date: string;
  type: AttendancePunchType;
  punchTime: string;
  reason: string;
  status: AttendanceMakeupRequestStatus;
  reviewedAt: string | null;
  createdAt: string;
  reviewerName: string | null;
};

export type AttendanceMonthlySummary = {
  month: string; // YYYY-MM
  startDate: string; // YYYY-MM-DD
  rangeEnd: string; // YYYY-MM-DD
  attendanceDays: number;
  restDays: number;
  missingSlots: number;
  overtimeMinutes: number;
  overtimeStr: string;
  remainingLeave?: number;
  rows: AttendancePunchDayRow[];
};
