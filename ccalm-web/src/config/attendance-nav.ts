import { ROUTES } from "@/config/routes";

/** 考勤分组下的子导航（侧栏与顶栏共用） */
export const attendanceSubNavItems: { title: string; url: string }[] = [
  { title: "考勤打卡", url: ROUTES.home },
  { title: "考勤统计", url: ROUTES.attendance.stats },
  { title: "排班表", url: ROUTES.attendance.schedule },
  { title: "打卡范围配置", url: ROUTES.attendance.checkInRange },
  { title: "班次时间配置", url: ROUTES.attendance.shiftSettings },
  { title: "人员管理", url: ROUTES.users.root },
];

const attendanceAdminOnlyUrls = new Set<string>([
  ROUTES.attendance.checkInRange,
  ROUTES.attendance.shiftSettings,
  ROUTES.users.root,
]);

/** 按角色过滤考勤子导航（非管理员隐藏配置与人员管理） */
export function attendanceNavItemsForRole(role?: string | null) {
  if (role === "admin") return attendanceSubNavItems;
  return attendanceSubNavItems.filter((item) => !attendanceAdminOnlyUrls.has(item.url));
}
