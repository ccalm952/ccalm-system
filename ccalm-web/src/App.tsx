import * as React from "react";
import { toast } from "sonner";
import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";

import { MainLayout } from "@/components/main-layout";
import { ROUTES } from "@/config/routes";
import { Spinner } from "@/components/ui/spinner";
import {
  api,
  getToken,
  setToken,
  setUnauthorizedHandler,
  type ApiError,
} from "@/lib/api";
import type { AuthMe } from "@/lib/auth";
import { AuthProvider } from "@/lib/auth-context";

const LoginPage = lazy(() =>
  import("./pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const AttendancePage = lazy(() =>
  import("./pages/attendance/AttendancePage").then((m) => ({
    default: m.AttendancePage,
  })),
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
  import("./pages/attendance/CheckInRangePage").then((m) => ({
    default: m.CheckInRangePage,
  })),
);
const SchedulePage = lazy(() =>
  import("./pages/attendance/SchedulePage").then((m) => ({
    default: m.SchedulePage,
  })),
);
const ImplantInventoryPage = lazy(() =>
  import("./pages/implant/ImplantInventoryPage").then((m) => ({
    default: m.ImplantInventoryPage,
  })),
);
const ImplantPatientPage = lazy(() =>
  import("./pages/implant/ImplantPatientPage").then((m) => ({
    default: m.ImplantPatientPage,
  })),
);
const ImplantPendingPage = lazy(() =>
  import("./pages/implant/ImplantPendingPage").then((m) => ({
    default: m.ImplantPendingPage,
  })),
);
const ImplantRecordsPage = lazy(() =>
  import("./pages/implant/ImplantRecordsPage").then((m) => ({
    default: m.ImplantRecordsPage,
  })),
);
const ImplantStatsPage = lazy(() =>
  import("./pages/implant/ImplantStatsPage").then((m) => ({
    default: m.ImplantStatsPage,
  })),
);
const OrthodonticsPage = lazy(() =>
  import("./pages/orthodontics/OrthodonticsPage").then((m) => ({
    default: m.OrthodonticsPage,
  })),
);
const StaffPage = lazy(() =>
  import("./pages/staff/StaffPage").then((m) => ({ default: m.StaffPage })),
);
const SalaryPage = lazy(() =>
  import("./pages/salary/SalaryPage").then((m) => ({ default: m.SalaryPage })),
);
const AppointmentBoardPage = lazy(() =>
  import("./pages/appointments/AppointmentBoardPage").then((m) => ({
    default: m.AppointmentBoardPage,
  })),
);
const WarehouseSection = lazy(() =>
  import("./pages/warehouse/WarehouseSection").then((m) => ({
    default: m.WarehouseSection,
  })),
);
const WorkbenchPage = lazy(() =>
  import("./pages/workbench/WorkbenchPage").then((m) => ({
    default: m.WorkbenchPage,
  })),
);
const PatientsPage = lazy(() =>
  import("./pages/patients/PatientsPage").then((m) => ({
    default: m.PatientsPage,
  })),
);
const PatientDetailPage = lazy(() =>
  import("./pages/patients/PatientDetailPage").then((m) => ({
    default: m.PatientDetailPage,
  })),
);
const ImplantComparePage = lazy(() =>
  import("./pages/materials/ImplantComparePage").then((m) => ({
    default: m.ImplantComparePage,
  })),
);

const FeeItemsPage = lazy(() =>
  import("./pages/fee-items/FeeItemsPage").then((m) => ({
    default: m.FeeItemsPage,
  })),
);

const RevenueReportPage = lazy(() =>
  import("./pages/reports/RevenueReportPage").then((m) => ({
    default: m.RevenueReportPage,
  })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Spinner className="size-8 opacity-60" />
    </div>
  );
}

function ProtectedRoute() {
  const [state, setState] = React.useState<"checking" | "authed" | "unauth">(
    "checking",
  );
  const [retryKey, setRetryKey] = React.useState(0);
  const attemptsRef = React.useRef(0);
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
    let timer: number | undefined;
    (async () => {
      try {
        const data = await api<AuthMe>("GET", "/auth/me");
        if (!cancelled) {
          attemptsRef.current = 0;
          setMe(data);
          setState("authed");
        }
      } catch (e) {
        const err = e as ApiError;
        if (!cancelled) {
          if (err.status === 401) {
            setToken(null);
            setState("unauth");
          } else {
            // 网络/服务暂不可用（例如后端重启）时自动重试，最多 8 次
            attemptsRef.current += 1;
            if (attemptsRef.current <= 8) {
              timer = window.setTimeout(() => {
                if (!cancelled) setRetryKey((k) => k + 1);
              }, 1500);
            } else if (!cancelled) {
              toast.error("服务暂时不可用，请稍后重试");
              setState("unauth");
            }
          }
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [retryKey]);

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

function App() {
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
            <Route
              path={ROUTES.home}
              element={<Navigate to={ROUTES.workbench.root} replace />}
            />

            <Route path="attendance">
              <Route
                index
                element={<Navigate to={ROUTES.attendance.checkIn} replace />}
              />
              <Route path="check-in" element={<AttendancePage />} />
              <Route path="check-in-range" element={<CheckInRangePage />} />
              <Route
                path="shift-settings"
                element={<AttendanceShiftSettingsPage />}
              />
              <Route path="stats" element={<AttendanceStatsPage />} />
              <Route path="schedule" element={<SchedulePage />} />
            </Route>

            <Route path={ROUTES.staff.root} element={<StaffPage />} />

            <Route path={ROUTES.workbench.root} element={<WorkbenchPage />} />

            <Route path="patients">
              <Route index element={<PatientsPage />} />
              <Route path=":id" element={<PatientDetailPage />} />
            </Route>

            <Route path="implant">
              <Route
                index
                element={<Navigate to={ROUTES.implant.records} replace />}
              />
              <Route path="records" element={<ImplantRecordsPage />} />
              <Route path="patients" element={<ImplantPatientPage />} />
              <Route path="pending" element={<ImplantPendingPage />} />
              <Route path="stats" element={<ImplantStatsPage />} />
              <Route path="inventory" element={<ImplantInventoryPage />} />
            </Route>

            <Route
              path={ROUTES.orthodontics.root}
              element={<OrthodonticsPage />}
            />
            <Route
              path="orthodontics/*"
              element={<Navigate to={ROUTES.orthodontics.root} replace />}
            />

            <Route path={ROUTES.salary.root} element={<SalaryPage />} />

            <Route
              path={ROUTES.appointments.root}
              element={<AppointmentBoardPage />}
            />
            <Route
              path="/appointments/list"
              element={<Navigate to={ROUTES.appointments.root} replace />}
            />

            <Route path="warehouse/*" element={<WarehouseSection />} />

            <Route path="materials">
              <Route
                index
                element={
                  <Navigate to={ROUTES.materials.implantCompare} replace />
                }
              />
              <Route path="implant-compare" element={<ImplantComparePage />} />
              <Route path="fee-items" element={<FeeItemsPage />} />
            </Route>

            <Route path="reports">
              <Route
                index
                element={<Navigate to={ROUTES.reports.revenue} replace />}
              />
              <Route path="revenue" element={<RevenueReportPage />} />
            </Route>

            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
