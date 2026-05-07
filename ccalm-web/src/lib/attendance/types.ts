export type AttendancePunchType = "morning_in" | "morning_out" | "afternoon_in" | "afternoon_out";

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
  overtimeMinutes: number;
  overtimeStr: string;
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
  rows: AttendancePunchDayRow[];
};
