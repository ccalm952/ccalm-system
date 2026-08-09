import * as React from "react";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { MainLayout } from "@/components/main-layout";
import { ROUTES } from "@/config/routes";
import { Spinner } from "@/components/ui/spinner";
import { api, getToken, setToken, setUnauthorizedHandler, type ApiError } from "@/lib/api";
import type { AuthMe } from "@/lib/auth";
import { AuthProvider } from "@/lib/auth-context";

const LoginPage = lazy(() =>
  import("./pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const AttendancePage = lazy(() =>
  import("./pages/attendance/AttendancePage").then((m) => ({ default: m.AttendancePage })),
);
const AttendanceShiftSettingsPage = lazy(() =>
  import("./pages/attendance/AttendanceShiftSettingsPage").then((m) => ({
    default: m.AttendanceShiftSettingsPage,
  })),
);
const AttendanceStatsPage = lazy(() =>
  import("./pages/attendance/AttendanceStatsPage").then((m) => ({
    default: m.AttendanceStatsPage,
  })),
);
const CheckInRangePage = lazy(() =>
  import("./pages/attendance/CheckInRangePage").then((m) => ({ default: m.CheckInRangePage })),
);
const SchedulePage = lazy(() =>
  import("./pages/attendance/SchedulePage").then((m) => ({ default: m.SchedulePage })),
);
const ImplantInventoryPage = lazy(() =>
  import("./pages/implant/ImplantInventoryPage").then((m) => ({
    default: m.ImplantInventoryPage,
  })),
);
const ImplantPatientPage = lazy(() =>
  import("./pages/implant/ImplantPatientPage").then((m) => ({ default: m.ImplantPatientPage })),
);
const ImplantPendingPage = lazy(() =>
  import("./pages/implant/ImplantPendingPage").then((m) => ({ default: m.ImplantPendingPage })),
);
const ImplantRecordsPage = lazy(() =>
  import("./pages/implant/ImplantRecordsPage").then((m) => ({ default: m.ImplantRecordsPage })),
);
const ImplantStatsPage = lazy(() =>
  import("./pages/implant/ImplantStatsPage").then((m) => ({ default: m.ImplantStatsPage })),
);
const OrthodonticsPage = lazy(() =>
  import("./pages/orthodontics/OrthodonticsPage").then((m) => ({ default: m.OrthodonticsPage })),
);
const UsersPage = lazy(() =>
  import("./pages/users/UsersPage").then((m) => ({ default: m.UsersPage })),
);
const SalaryPage = lazy(() =>
  import("./pages/salary/SalaryPage").then((m) => ({ default: m.SalaryPage })),
);
const MemosPage = lazy(() =>
  import("./pages/memos/MemosPage").then((m) => ({ default: m.MemosPage })),
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
              <Route index element={<Navigate to={ROUTES.home} replace />} />
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
              <Route path="pending" element={<ImplantPendingPage />} />
              <Route path="stats" element={<ImplantStatsPage />} />
              <Route path="inventory" element={<ImplantInventoryPage />} />
            </Route>

            <Route path="orthodontics">
              <Route
                index
                element={<Navigate to={ROUTES.orthodontics.treating} replace />}
              />
              <Route path="treating" element={<OrthodonticsPage />} />
              <Route path="appliance" element={<OrthodonticsPage />} />
              <Route path="completed" element={<OrthodonticsPage />} />
            </Route>

            <Route path={ROUTES.salary.root} element={<SalaryPage />} />

            <Route path={ROUTES.memos.root} element={<MemosPage />} />

            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
