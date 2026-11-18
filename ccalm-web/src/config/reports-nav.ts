import { ROUTES } from "./routes";

/** 报表分组下的子导航（侧栏与顶栏共用） */
export const reportsSubNavItems: { title: string; url: string }[] = [
  { title: "营收分析", url: ROUTES.reports.revenue },
];
