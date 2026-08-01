import { ROUTES } from "@/config/routes";

export const orthodonticsSubNavItems: { title: string; url: string }[] = [
  { title: "治疗中", url: ROUTES.orthodontics.treating },
  { title: "矫治器", url: ROUTES.orthodontics.appliance },
  { title: "已完成", url: ROUTES.orthodontics.completed },
];
