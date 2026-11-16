import { ROUTES } from "@/config/routes";
import type { AuthMe } from "@/lib/auth";
import { can } from "@/lib/permissions";

/** 考勤分组下的子导航（侧栏与顶栏共用） */
const attendanceSubNavItems: { title: string; url: string }[] = [
  { title: "考勤打卡", url: ROUTES.attendance.checkIn },
  { title: "考勤统计", url: ROUTES.attendance.stats },
  { title: "排班表", url: ROUTES.attendance.schedule },
  { title: "打卡范围配置", url: ROUTES.attendance.checkInRange },
  { title: "班次时间配置", url: ROUTES.attendance.shiftSettings },
];

const attendanceManageOnlyUrls = new Set<string>([
  ROUTES.attendance.checkInRange,
  ROUTES.attendance.shiftSettings,
]);

/** 按权限过滤考勤子导航（没有「管理他人考勤/排班」权限时隐藏配置） */
export function attendanceNavItemsFor(me: AuthMe | null) {
  if (can(me, "attendance.manage")) return attendanceSubNavItems;
  return attendanceSubNavItems.filter(
    (item) => !attendanceManageOnlyUrls.has(item.url),
  );
}
