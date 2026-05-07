import { ROUTES } from "@/config/routes";

/** 考勤分组下的子导航（侧栏与顶栏共用） */
export const attendanceSubNavItems: { title: string; url: string }[] = [
  { title: "考勤打卡", url: ROUTES.home },
  { title: "考勤统计", url: ROUTES.attendance.stats },
  { title: "打卡范围配置", url: ROUTES.attendance.checkInRange },
  { title: "班次时间配置", url: ROUTES.attendance.shiftSettings },
  { title: "人员管理", url: ROUTES.users.root },
];
