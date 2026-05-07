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
const AttendancePage = lazyNamed(() => import("./pages/attendance/AttendancePage"), "AttendancePage");
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
const UsersPage = lazyNamed(() => import("./pages/users/UsersPage"), "UsersPage");
const PlantingInventoryPage = lazyNamed(
  () => import("./pages/planting/PlantingInventoryPage"),
  "PlantingInventoryPage",
);
const PlantingPatientPage = lazyNamed(
  () => import("./pages/planting/PlantingPatientPage"),
  "PlantingPatientPage",
);
const PlantingRecordsPage = lazyNamed(
  () => import("./pages/planting/PlantingRecordsPage"),
  "PlantingRecordsPage",
);
const PlantingStatsPage = lazyNamed(() => import("./pages/planting/PlantingStatsPage"), "PlantingStatsPage");

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
              </Route>

              <Route path={ROUTES.users.root} element={<UsersPage />} />

              <Route path="planting">
                <Route index element={<Navigate to={ROUTES.planting.records} replace />} />
                <Route path="records" element={<PlantingRecordsPage />} />
                <Route path="patients" element={<PlantingPatientPage />} />
                <Route path="stats" element={<PlantingStatsPage />} />
                <Route path="inventory" element={<PlantingInventoryPage />} />
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
