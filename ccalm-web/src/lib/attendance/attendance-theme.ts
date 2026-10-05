import type { AttendanceMakeupRequest, ScheduleRestType } from "./types";

/**
 * 考勤四色体系（映射 shadcn 主题 token）：
 * - 正文 foreground：打卡时间、有数据、时钟强调
 * - 次要 muted-foreground：说明、占位、进行中、无数据
 * - 强调 primary：可点击 link（与薪资表录入色一致）
 * - 警示 destructive：缺卡、错误、节假日
 * 排班「全/上/下」色块单独用青绿 / 玫红 / 蓝紫，便于扫表区分
 */

/** 次要文字 */
export const attendanceMutedTextClass = "text-muted-foreground";

/** 正文（无额外 class 时继承 foreground） */
const attendanceTimeTextClass = "";

/** 时钟等大号强调 */
export const attendanceBrandTextClass = "text-foreground";

/** 警示 */
export const attendanceMissingTextClass = "text-destructive";

export const attendanceErrorTextClass = attendanceMissingTextClass;

/** 与次要色相同（审批中不再单独用琥珀色） */
export const attendancePendingTextClass = attendanceMutedTextClass;

/** 考勤表格表头 */
export const attendanceTableHeaderClass = `bg-muted/40 ${attendanceMutedTextClass}`;

/** 统计表列宽（对齐等分，行高沿用 Table 默认 h-10） */
export const attendanceStatsTableColumnClass = "w-1/6";

/** 统计页展开明细行 */
export const attendanceExpandedRowClass = "bg-muted/10";

/** 设置页区块小标题 */
export const attendanceSectionTitleClass = `mb-3 text-sm font-semibold ${attendanceMutedTextClass}`;

/** 补卡待办：申请状态（仅四色） */
const makeupRequestStatusClass: Record<
  AttendanceMakeupRequest["status"],
  string
> = {
  pending: attendanceMutedTextClass,
  approved: attendanceTimeTextClass,
  rejected: attendanceMutedTextClass,
};

/** 补卡待办角标 */
export const makeupTodoBadgeClass =
  "inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium leading-none text-primary-foreground";

/** 排班表：法定节假日列头文字 */
export const scheduleHolidayHeaderClass =
  "text-destructive dark:text-red-400";

/** 排班表头次要文字（深色提高可见度） */
export const scheduleHeaderMutedClass =
  "text-muted-foreground dark:text-foreground/75";

/** 排班行悬停灰底 */
export const scheduleCellHoverClass =
  "group-hover:bg-muted/60 dark:group-hover:bg-muted";

/** 排班表：左侧姓名粘滞 */
export const scheduleStickyNameClass = [
  "sticky left-0 z-10 bg-card",
  "shadow-[4px_0_8px_-6px_rgba(0,0,0,0.12)] dark:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]",
  scheduleCellHoverClass,
].join(" ");

/** 排班表：姓名表头粘滞 */
export const scheduleStickyNameHeaderClass = [
  "sticky left-0 z-20 bg-card",
  "shadow-[4px_0_8px_-6px_rgba(0,0,0,0.12)] dark:shadow-[4px_0_12px_-4px_rgba(0,0,0,0.65)]",
].join(" ");

/**
 * 排班格色块：全=青绿、上=玫红、下=蓝紫，色相区分（非灰阶）
 */
export const SCHEDULE_SHIFT_CELL_CLASS: Record<ScheduleRestType, string> = {
  full_rest:
    "bg-teal-500/18 font-medium text-teal-800 dark:bg-teal-400/35 dark:text-teal-100",
  morning_rest:
    "bg-rose-500/18 font-medium text-rose-700 dark:bg-rose-400/35 dark:text-rose-100",
  afternoon_rest:
    "bg-violet-500/18 font-medium text-violet-800 dark:bg-violet-400/35 dark:text-violet-100",
};

export const SCHEDULE_SHIFT_SWATCH_CLASS: Record<
  ScheduleRestType | "empty",
  string
> = {
  empty: "bg-transparent ring-1 ring-inset ring-border/70 dark:ring-white/25",
  full_rest: "bg-teal-500/35 dark:bg-teal-400/50",
  morning_rest: "bg-rose-500/35 dark:bg-rose-400/50",
  afternoon_rest: "bg-violet-500/35 dark:bg-violet-400/50",
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
  if (!shift) return "";
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
  return hasOvertime(overtimeStr)
    ? attendanceTimeTextClass
    : attendanceMutedTextClass;
}

export function detailOvertimeClass(overtimeStr: string): string {
  return summaryOvertimeClass(overtimeStr);
}
