import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";

import { WarehouseConsumptionStatsPage } from "./WarehouseConsumptionStatsPage";
import { WarehouseLedgerPage } from "./WarehouseLedgerPage";
import { WarehouseStatsPage } from "./WarehouseStatsPage";

function normalizeWarehousePath(pathname: string) {
  const base = ROUTES.warehouse.root.replace(/\/$/, "");
  if (pathname === base || pathname === `${base}/`) return "index" as const;
  if (pathname === ROUTES.warehouse.ledger || pathname.endsWith("/warehouse/ledger")) {
    return "ledger" as const;
  }
  if (pathname === ROUTES.warehouse.stats || pathname.endsWith("/warehouse/stats")) {
    return "stats" as const;
  }
  if (
    pathname === ROUTES.warehouse.consumption ||
    pathname.endsWith("/warehouse/consumption")
  ) {
    return "consumption" as const;
  }
  return "unknown" as const;
}

/**
 * 库存子页保活：在台账与统计页之间切换时不卸载页面，避免重挂载导致的数据清空与布局闪动。
 */
export function WarehouseSection() {
  const { pathname } = useLocation();
  const tab = normalizeWarehousePath(pathname);

  const [visited, setVisited] = React.useState({
    ledger: tab === "ledger",
    stats: tab === "stats",
    consumption: tab === "consumption",
  });

  React.useEffect(() => {
    setVisited((prev) => ({
      ledger: prev.ledger || tab === "ledger",
      stats: prev.stats || tab === "stats",
      consumption: prev.consumption || tab === "consumption",
    }));
  }, [tab]);

  if (tab === "index") {
    return <Navigate to={ROUTES.warehouse.ledger} replace />;
  }

  if (tab === "unknown") {
    return <Navigate to={ROUTES.warehouse.ledger} replace />;
  }

  return (
    <>
      {visited.ledger ? (
        <div
          className={cn("flex min-h-0 min-w-0 flex-1 flex-col", tab !== "ledger" && "hidden")}
          aria-hidden={tab !== "ledger"}
        >
          <WarehouseLedgerPage />
        </div>
      ) : null}
      {visited.stats ? (
        <div
          className={cn("flex min-h-0 min-w-0 flex-1 flex-col", tab !== "stats" && "hidden")}
          aria-hidden={tab !== "stats"}
        >
          <WarehouseStatsPage />
        </div>
      ) : null}
      {visited.consumption ? (
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            tab !== "consumption" && "hidden",
          )}
          aria-hidden={tab !== "consumption"}
        >
          <WarehouseConsumptionStatsPage />
        </div>
      ) : null}
    </>
  );
}
