import * as React from "react";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { MainLayout } from "@/components/main-layout";
import { ROUTES } from "@/config/routes";
import { Spinner } from "@/components/ui/spinner";
import { api, getToken, setToken, setUnauthorizedHandler, type ApiError } from "@/lib/api";
import type { AuthMe } from "@/lib/auth";
import { AuthProvider } from "@/lib/auth-context";
import { AttendancePage } from "@/pages/attendance/AttendancePage";
import { AttendanceShiftSettingsPage } from "@/pages/attendance/AttendanceShiftSettingsPage";
import { AttendanceStatsPage } from "@/pages/attendance/AttendanceStatsPage";
import { CheckInRangePage } from "@/pages/attendance/CheckInRangePage";
import { SchedulePage } from "@/pages/attendance/SchedulePage";
import { ImplantInventoryPage } from "@/pages/implant/ImplantInventoryPage";
import { ImplantPatientPage } from "@/pages/implant/ImplantPatientPage";
import { ImplantRecordsPage } from "@/pages/implant/ImplantRecordsPage";
import { ImplantStatsPage } from "@/pages/implant/ImplantStatsPage";
import { UsersPage } from "@/pages/users/UsersPage";
import { WarehouseSection } from "@/pages/warehouse/WarehouseSection";
import { SalaryPage } from "@/pages/salary/SalaryPage";

const LoginPage = lazy(() =>
  import("./pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
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
    setUnauthorizedHandler(() => {
      setMe(null);
      setState("unauth");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  React.useEffect(() => {
    const token = getToken();
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
      <Routes>
        <Route
          path={ROUTES.auth.login}
          element={
            <Suspense fallback={<RouteFallback />}>
              <LoginPage />
            </Suspense>
          }
        />
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

            <Route path="warehouse/*" element={<WarehouseSection />} />

            <Route path={ROUTES.salary.root} element={<SalaryPage />} />

            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
