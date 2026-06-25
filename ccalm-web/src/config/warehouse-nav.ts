import { ROUTES } from "@/config/routes";

export const warehouseSubNavItems: { title: string; url: string }[] = [
  { title: "库存台账", url: ROUTES.warehouse.ledger },
  { title: "采购统计", url: ROUTES.warehouse.stats },
];
