import { ROUTES } from "@/config/routes";

export const orthodonticsSubNavItems: { title: string; url: string }[] = [
  { title: "在治", url: ROUTES.orthodontics.active },
  { title: "矫治器", url: ROUTES.orthodontics.appliance },
  { title: "已拆", url: ROUTES.orthodontics.removed },
];
