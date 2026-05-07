import { ROUTES } from "@/config/routes";

/** 种植模块顶栏子导航（与考勤 sub nav 结构一致，供 NavigationMenu 使用） */
export const plantingSubNavItems: { title: string; url: string }[] = [
  { title: "种植记录", url: ROUTES.planting.records },
  { title: "种植患者", url: ROUTES.planting.patients },
  { title: "统计", url: ROUTES.planting.stats },
  { title: "库存", url: ROUTES.planting.inventory },
];
