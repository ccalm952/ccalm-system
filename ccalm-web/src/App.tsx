import * as React from "react";
import { lazy, Suspense, type ComponentType } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { MainLayout } from "@/components/main-layout";
import { ROUTES } from "@/config/routes";
import { Spinner } from "@/components/ui/spinner";
import { api, type ApiError, setToken } from "@/lib/api";
import type { AuthMe } from "@/lib/auth";
import { AuthProvider } from "@/lib/auth-context";

type NamedComponentModule = Record<string, ComponentType>;

function lazyNamed<T extends NamedComponentModule, K extends keyof T>(
  loader: () => Promise<T>,
  exportName: K,
) {
  return lazy(() => loader().then((m) => ({ default: m[exportName] })));
}

const LoginPage = lazyNamed(() => import("./pages/auth/LoginPage"), "LoginPage");
const AttendancePage = lazyNamed(
  () => import("./pages/attendance/AttendancePage"),
  "AttendancePage",
);
const AttendanceShiftSettingsPage = lazyNamed(
  () => import("./pages/attendance/AttendanceShiftSettingsPage"),
  "AttendanceShiftSettingsPage",
);
const AttendanceStatsPage = lazyNamed(
  () => import("./pages/attendance/AttendanceStatsPage"),
  "AttendanceStatsPage",
);
const CheckInRangePage = lazyNamed(
  () => import("./pages/attendance/CheckInRangePage"),
  "CheckInRangePage",
);
const SchedulePage = lazyNamed(() => import("./pages/attendance/SchedulePage"), "SchedulePage");
const UsersPage = lazyNamed(() => import("./pages/users/UsersPage"), "UsersPage");
const ImplantInventoryPage = lazyNamed(
  () => import("./pages/implant/ImplantInventoryPage"),
  "ImplantInventoryPage",
);
const ImplantPatientPage = lazyNamed(
  () => import("./pages/implant/ImplantPatientPage"),
  "ImplantPatientPage",
);
const ImplantRecordsPage = lazyNamed(
  () => import("./pages/implant/ImplantRecordsPage"),
  "ImplantRecordsPage",
);
const ImplantStatsPage = lazyNamed(
  () => import("./pages/implant/ImplantStatsPage"),
  "ImplantStatsPage",
);
const WarehouseLedgerPage = lazyNamed(
  () => import("./pages/warehouse/WarehouseLedgerPage"),
  "WarehouseLedgerPage",
);
const WarehouseStatsPage = lazyNamed(
  () => import("./pages/warehouse/WarehouseStatsPage"),
  "WarehouseStatsPage",
);

function RouteFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Spinner className="size-8 opacity-60" />
    </div>
  );
}

function ProtectedRoute() {
  const [state, setState] = React.useState<"checking" | "authed" | "unauth">("checking");
  const [me, setMe] = React.useState<AuthMe | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem("auth:token");
    if (!token) {
      setState("unauth");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await api<AuthMe>("GET", "/auth/me");
        if (!cancelled) {
          setMe(data);
          setState("authed");
        }
      } catch (e) {
        const err = e as ApiError;
        if (err.status === 401) {
          setToken(null);
        }
        if (!cancelled) {
          setState("unauth");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return <RouteFallback />;
  }

  if (state === "unauth") {
    return <Navigate to={ROUTES.auth.login} replace />;
  }

  return (
    <AuthProvider me={me} setMe={setMe}>
      <Outlet />
    </AuthProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path={ROUTES.auth.login} element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path={ROUTES.home} element={<AttendancePage />} />

              <Route path="attendance">
                <Route index element={<AttendancePage />} />
                <Route path="check-in-range" element={<CheckInRangePage />} />
                <Route path="shift-settings" element={<AttendanceShiftSettingsPage />} />
                <Route path="stats" element={<AttendanceStatsPage />} />
                <Route path="schedule" element={<SchedulePage />} />
              </Route>

              <Route path={ROUTES.users.root} element={<UsersPage />} />

              <Route path="implant">
                <Route index element={<Navigate to={ROUTES.implant.records} replace />} />
                <Route path="records" element={<ImplantRecordsPage />} />
                <Route path="patients" element={<ImplantPatientPage />} />
                <Route path="stats" element={<ImplantStatsPage />} />
                <Route path="inventory" element={<ImplantInventoryPage />} />
              </Route>

              <Route path="warehouse">
                <Route index element={<Navigate to={ROUTES.warehouse.ledger} replace />} />
                <Route path="ledger" element={<WarehouseLedgerPage />} />
                <Route path="stats" element={<WarehouseStatsPage />} />
              </Route>

              <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
