import { Navigate, useLocation } from "react-router-dom";

import { ROUTES } from "@/config/routes";

import { WarehouseLedgerPage } from "./WarehouseLedgerPage";

/** 库存仅台账；旧 /warehouse/ledger|stats|consumption 重定向到 /warehouse */
export function WarehouseSection() {
  const { pathname } = useLocation();
  const base = ROUTES.warehouse.root.replace(/\/$/, "");
  if (pathname !== base && pathname !== `${base}/`) {
    return <Navigate to={ROUTES.warehouse.root} replace />;
  }
  return <WarehouseLedgerPage />;
}
