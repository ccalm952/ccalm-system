import type { AttendanceMakeupRequest, ScheduleRestType } from "./types";

/**
 * 考勤四色体系（映射 shadcn 主题 token）：
 * - 正文 foreground：打卡时间、有数据、时钟强调
 * - 次要 muted-foreground：说明、占位、进行中、无数据
 * - 强调 foreground + 字重/下划线：可点击 link（主题下 primary 与正文有区分，表格内操作用 foreground）
 * - 警示 destructive：缺卡、错误、节假日、排班「上」
 */

/** 次要文字 */
export const attendanceMutedTextClass = "text-muted-foreground";

/** 正文（无额外 class 时继承 foreground） */
export const attendanceTimeTextClass = "";

/** 时钟等大号强调 */
export const attendanceBrandTextClass = "text-foreground";

/** 警示 */
export const attendanceMissingTextClass = "text-destructive";

export const attendanceErrorTextClass = attendanceMissingTextClass;

/** 与次要色相同（审批中不再单独用琥珀色） */
export const attendancePendingTextClass = attendanceMutedTextClass;

/** 考勤表格表头 */
export const attendanceTableHeaderClass = `bg-muted/40 ${attendanceMutedTextClass}`;

/** 统计表列宽与对齐（六等分、水平居中） */
export const attendanceStatsTableColumnClass = "w-1/6 px-3 py-2 text-center";

/** 统计页展开明细行 */
export const attendanceExpandedRowClass = "bg-muted/10";

/** 表格内 link 操作（字重 + 悬停下划线） */
export const tableActionLinkClass =
  "h-auto px-0 text-sm font-medium text-foreground underline-offset-4 hover:underline";

/** 设置页区块小标题 */
export const attendanceSectionTitleClass = `mb-3 text-sm font-semibold ${attendanceMutedTextClass}`;

/** 补卡待办：申请状态（仅四色） */
export const makeupRequestStatusClass: Record<AttendanceMakeupRequest["status"], string> = {
  pending: attendanceMutedTextClass,
  approved: attendanceTimeTextClass,
  rejected: attendanceMutedTextClass,
};

/** 补卡待办角标 */
export const makeupTodoBadgeClass =
  "inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium leading-none text-primary-foreground";

/** 排班表：法定节假日列头 */
export const scheduleHolidayHeaderClass = attendanceMissingTextClass;

/** 排班格：全=前景淡底，上=destructive 淡底，下=muted 实底 */
export const SCHEDULE_SHIFT_CELL_CLASS: Record<ScheduleRestType, string> = {
  full_rest: "bg-foreground/8 text-foreground",
  morning_rest: "bg-destructive/12 text-foreground",
  afternoon_rest: "bg-muted text-foreground",
};

export const SCHEDULE_SHIFT_SWATCH_CLASS: Record<ScheduleRestType | "empty", string> = {
  empty: "bg-background ring-1 ring-inset ring-border",
  full_rest: "bg-foreground/8",
  morning_rest: "bg-destructive/12",
  afternoon_rest: "bg-muted",
};

export const SCHEDULE_SHIFT_LEGEND: Array<{
  key: ScheduleRestType | "empty";
  label: string;
  hint: string;
}> = [
  { key: "empty", label: "空", hint: "正常出勤" },
  { key: "full_rest", label: "全", hint: "整天休息" },
  { key: "morning_rest", label: "上", hint: "上午休息" },
  { key: "afternoon_rest", label: "下", hint: "下午休息" },
];

export function scheduleShiftCellClass(shift: ScheduleRestType | null): string {
  if (!shift) return `bg-background ${attendanceMutedTextClass}`;
  return SCHEDULE_SHIFT_CELL_CLASS[shift];
}

export function makeupRequestStatusTextClass(
  status: AttendanceMakeupRequest["status"],
): string {
  return makeupRequestStatusClass[status] ?? attendanceMutedTextClass;
}

export function hasOvertime(overtimeStr: string): boolean {
  const v = overtimeStr.trim();
  return v !== "" && v !== "-";
}

export function summaryMissingSlotsClass(count: number): string {
  return count > 0 ? attendanceMissingTextClass : attendanceTimeTextClass;
}

export function summaryOvertimeClass(overtimeStr: string): string {
  return hasOvertime(overtimeStr) ? attendanceTimeTextClass : attendanceMutedTextClass;
}

export function detailOvertimeClass(overtimeStr: string): string {
  return summaryOvertimeClass(overtimeStr);
}
