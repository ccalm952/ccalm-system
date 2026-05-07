import { ROUTES } from "@/config/routes";

export const implantSubNavItems: { title: string; url: string }[] = [
  { title: "种植记录", url: ROUTES.implant.records },
  { title: "种植患者", url: ROUTES.implant.patients },
  { title: "统计", url: ROUTES.implant.stats },
  { title: "库存", url: ROUTES.implant.inventory },
];
