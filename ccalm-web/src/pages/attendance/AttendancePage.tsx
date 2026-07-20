import * as React from "react";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { isPunchBlockedByScheduleRest } from "@/lib/attendance/schedule-rest";
import { CircleXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Timeline,
  TimelineContent,
  TimelineDescription,
  TimelineIndicator,
  TimelineItem,
  TimelineTime,
  TimelineTitle,
} from "@/components/ui/timeline";
import { requestAmapGeolocation } from "@/lib/amap-geolocate";
import { reverseGeocodeDisplayAddress } from "@/lib/amap-regeo";
import { AttendanceHalfOutCell } from "@/components/attendance-half-out-cell";
import { AttendanceInCell } from "@/components/attendance-in-cell";
import { MakeupRequestDialog } from "@/components/makeup-request-dialog";
import { RestActionDialog } from "@/components/rest-action-dialog";
import type { EmployeeMakeupType, MakeupTodayGate } from "@/lib/attendance/makeup";
import { makeupTodayGateFromShift } from "@/lib/attendance/makeup";
import { attendanceInCellClass, attendanceOutCellClass, type AttendanceCellClassOptions } from "@/lib/attendance/cell-class";
import { attendanceBrandTextClass, attendanceErrorTextClass, attendanceMutedTextClass, attendanceTableHeaderClass, hasOvertime, summaryMissingSlotsClass, summaryOvertimeClass } from "@/lib/attendance/attendance-theme";
import type { RestHalf } from "@/lib/attendance/rest";
import {
  ATTENDANCE_PUNCH_TYPE_LABEL,
  type AttendancePunchType,
  type AttendanceMonthlySummary,
  type AttendanceMakeupRequest,
  type AttendanceRecord,
  type GeofenceConfig,
  type ScheduleRestType,
} from "@/lib/attendance/types";
import { isWallClockInInclusiveRange, type BackendShiftDto } from "@/lib/attendance/shift";
import { todayKey, formatDayCount } from "@/lib/attendance/summary";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LocationState = {
  locating: boolean;
  attempted: boolean;
  lat: number;
  lng: number;
  address?: string;
};

type PunchAttemptResult = "success" | "outside_fence" | "outside_time";

const punchTypes: AttendancePunchType[] = [
  "morning_in",
  "morning_out",
  "afternoon_in",
  "afternoon_out",
];

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function insideFenceFor(
  lat: number,
  lng: number,
  fence: { enabled: boolean; centerLat: number; centerLng: number; radiusM: number },
): boolean {
  if (!fence.enabled) return true;
  if (!lat) return false;
  return haversineDistanceMeters(lat, lng, fence.centerLat, fence.centerLng) <= fence.radiusM;
}

function todayTypeMapFromRecords(
  records: AttendanceRecord[],
): Partial<Record<AttendancePunchType, AttendanceRecord>> {
  const key = todayKey();
  const list = records
    .filter((r) => dayjs(r.punchTime).isValid() && dayjs(r.punchTime).format("YYYY-MM-DD") === key)
    .sort((a, b) => dayjs(a.punchTime).valueOf() - dayjs(b.punchTime).valueOf());
  const map: Partial<Record<AttendancePunchType, AttendanceRecord>> = {};
  for (const r of list) map[r.type] = r;
  return map;
}

function isManualPunchDisabledPure(
  t: AttendancePunchType,
  opts: {
    lat: number;
    lng: number;
    fence: { enabled: boolean; centerLat: number; centerLng: number; radiusM: number };
    shift: {
      morningInWindowStart: string;
      morningInWindowEnd: string;
      morningOutWindowStart: string;
      morningOutWindowEnd: string;
      afternoonInWindowStart: string;
      afternoonInWindowEnd: string;
      afternoonOutWindowStart: string;
      afternoonOutWindowEnd: string;
    };
    map: Partial<Record<AttendancePunchType, AttendanceRecord>>;
    declaredRest: ScheduleRestType | null;
    at: Date;
  },
): boolean {
  if (!opts.lat) return true;
  if (opts.fence.enabled && !insideFenceFor(opts.lat, opts.lng, opts.fence)) return true;
  if (isPunchBlockedByScheduleRest(t, opts.declaredRest)) return true;
  const { shift, map, at } = opts;

  if (t === "morning_in") {
    if (map.morning_in) return true;
    if (!isWallClockInInclusiveRange(at, shift.morningInWindowStart, shift.morningInWindowEnd))
      return true;
  }

  if (t === "morning_out" && !map.morning_in) return true;
  if (
    t === "morning_out" &&
    !isWallClockInInclusiveRange(at, shift.morningOutWindowStart, shift.morningOutWindowEnd)
  )
    return true;

  if (t === "afternoon_in") {
    if (map.afternoon_in) return true;
    if (!isWallClockInInclusiveRange(at, shift.afternoonInWindowStart, shift.afternoonInWindowEnd))
      return true;
  }

  if (t === "afternoon_out" && !map.afternoon_in) return true;
  if (
    t === "afternoon_out" &&
    !isWallClockInInclusiveRange(at, shift.afternoonOutWindowStart, shift.afternoonOutWindowEnd)
  )
    return true;

  return false;
}

function pickQuickPunchTypePure(
  opts: Parameters<typeof isManualPunchDisabledPure>[1],
): AttendancePunchType | null {
  for (const t of punchTypes) {
    if (!isManualPunchDisabledPure(t, opts)) return t;
  }
  return null;
}

function dayOfMonth(date: string): string {
  const d = dayjs(date);
  return d.isValid() ? String(d.date()) : date;
}

function formatCurrentLocation(loc: Pick<LocationState, "lat" | "lng" | "address">): string {
  if (loc.address?.trim()) return loc.address.trim();
  if (loc.lat && loc.lng) return `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
  return "当前位置";
}

async function locateWithAddress(): Promise<Pick<LocationState, "lat" | "lng" | "address">> {
  const { lat, lng } = await requestAmapGeolocation();
  let address = "";
  try {
    address = await reverseGeocodeDisplayAddress(lat, lng);
  } catch {
    // 坐标仍可用
  }
  return { lat, lng, address };
}

function notifyPunchAttempt(result: PunchAttemptResult | null) {
  const failIcon = <CircleXIcon className="size-4" />;
  if (result === "success") toast.success("打卡成功");
  else if (result === "outside_fence") toast("不在打卡范围内", { icon: failIcon });
  else if (result === "outside_time") toast("不在打卡时间内", { icon: failIcon });
}

function LiveClock() {
  const [now, setNow] = React.useState(() => dayjs());

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(dayjs()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <div className={cn("text-5xl font-semibold tabular-nums", attendanceBrandTextClass)}>
        {now.format("HH:mm:ss")}
      </div>
      <div className={cn("text-sm", attendanceMutedTextClass)}>
        {now.locale("zh-cn").format("YYYY年M月D日 dddd")}
      </div>
    </>
  );
}

export function AttendancePage() {
  const [loc, setLoc] = React.useState<LocationState>(() => {
    try {
      const raw = sessionStorage.getItem("attendance_last_loc");
      if (!raw) return { locating: false, attempted: false, lat: 0, lng: 0 };
      const v = JSON.parse(raw) as { lat?: number; lng?: number; address?: string };
      const lat = Number(v.lat || 0);
      const lng = Number(v.lng || 0);
      if (!lat || !lng) return { locating: false, attempted: false, lat: 0, lng: 0 };
      return {
        locating: false,
        attempted: true,
        lat,
        lng,
        address: typeof v.address === "string" ? v.address : undefined,
      };
    } catch {
      return { locating: false, attempted: false, lat: 0, lng: 0 };
    }
  });
  const [currentMonth, setCurrentMonth] = React.useState(() => dayjs().format("YYYY-MM"));

  React.useEffect(() => {
    const id = window.setInterval(() => {
      const next = dayjs().format("YYYY-MM");
      setCurrentMonth((prev) => (prev === next ? prev : next));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { me } = useAuth();
  const [records, setRecords] = React.useState<AttendanceRecord[]>([]);
  const [monthSummary, setMonthSummary] = React.useState<AttendanceMonthlySummary | null>(null);
  const [shift, setShift] = React.useState<BackendShiftDto | null>(null);
  const [makeupRequests, setMakeupRequests] = React.useState<AttendanceMakeupRequest[]>([]);
  const [makeupDialog, setMakeupDialog] = React.useState<{
    date: string;
    type: EmployeeMakeupType;
  } | null>(null);
  const [restDialog, setRestDialog] = React.useState<{
    date: string;
    half: RestHalf;
    mode: "declare" | "clear";
    declaredRest?: ScheduleRestType | null;
  } | null>(null);
  const [makeupTodayGate, setMakeupTodayGate] = React.useState<MakeupTodayGate | undefined>();
  const [gateTick, setGateTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setGateTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const cellClassOptions = React.useMemo((): AttendanceCellClassOptions => {
    void gateTick;
    return {
      todayYmd: todayKey(),
      at: new Date(),
      shift: shift ?? undefined,
    };
  }, [shift, gateTick]);

  const reloadMakeupRequests = React.useCallback(async () => {
    try {
      const list = await api<AttendanceMakeupRequest[]>(
        "GET",
        "/attendance/makeup-requests/mine?status=pending",
      );
      setMakeupRequests(list);
    } catch {
      setMakeupRequests([]);
    }
  }, []);

  const loadAttendanceBundle = React.useCallback(async (month: string) => {
    const {
      today: todayRes,
      monthly,
      shift: shiftRes,
    } = await api<{
      today: AttendanceRecord[];
      monthly: AttendanceMonthlySummary;
      shift: BackendShiftDto;
    }>("GET", `/attendance/bundle?month=${month}`);
    setRecords(todayRes);
    setMonthSummary(monthly);
    setShift(shiftRes);
    setMakeupTodayGate(makeupTodayGateFromShift(shiftRes));
    return { todayRes, monthly, shiftRes };
  }, []);

  const reloadAfterMutation = React.useCallback(async () => {
    await Promise.all([loadAttendanceBundle(currentMonth), reloadMakeupRequests()]);
  }, [currentMonth, loadAttendanceBundle, reloadMakeupRequests]);

  const autoPunchEpochRef = React.useRef(0);
  const autoLocateDoneRef = React.useRef(false);
  const didSessionAutoLocateRef = React.useRef(false);

  React.useEffect(() => {
    if (!loc.lat || !loc.lng) return;
    sessionStorage.setItem(
      "attendance_last_loc",
      JSON.stringify({ lat: loc.lat, lng: loc.lng, address: loc.address ?? "" }),
    );
  }, [loc.lat, loc.lng, loc.address]);

  async function autoPunchAfterLocate(opts: {
    lat: number;
    lng: number;
    address?: string;
    geofenceRes: GeofenceConfig;
    shiftRes: BackendShiftDto;
    recordsSnapshot: AttendanceRecord[];
    declaredRest: ScheduleRestType | null;
    cancelled?: () => boolean;
    session?: number;
  }): Promise<PunchAttemptResult | null> {
    const { lat, lng, address, geofenceRes, shiftRes, recordsSnapshot, declaredRest, cancelled, session } = opts;

    if (geofenceRes.enabled && !insideFenceFor(lat, lng, geofenceRes)) {
      return "outside_fence";
    }

    const map = todayTypeMapFromRecords(recordsSnapshot);
    const quick = pickQuickPunchTypePure({
      lat,
      lng,
      fence: geofenceRes,
      shift: shiftRes,
      map,
      declaredRest,
      at: new Date(),
    });
    if (!quick) return "outside_time";

    const punched = await api<AttendanceRecord>("POST", "/attendance/punch", {
      type: quick,
      latitude: lat,
      longitude: lng,
      address: address?.trim() || "",
    });
    if (cancelled?.() || (session !== undefined && session !== autoPunchEpochRef.current))
      return null;

    const monthly2 = await api<AttendanceMonthlySummary>(
      "GET",
      `/attendance/summary/monthly?month=${dayjs().format("YYYY-MM")}`,
    );
    if (cancelled?.() || (session !== undefined && session !== autoPunchEpochRef.current))
      return null;

    setRecords((current) => [
      ...current.filter((record) => record.type !== punched.type),
      punched,
    ]);
    setMonthSummary(monthly2);
    return "success";
  }

  React.useEffect(() => {
    if (!me?.id) return;
    let cancelled = false;

    void (async () => {
      try {
        const tryAutoLocate = (() => {
          if (autoLocateDoneRef.current) return false;
          const navEntry = performance.getEntriesByType?.("navigation")?.[0] as
            | PerformanceNavigationTiming
            | undefined;
          const isReload = navEntry?.type === "reload";
          if (!didSessionAutoLocateRef.current) {
            didSessionAutoLocateRef.current =
              sessionStorage.getItem("attendance_auto_located") === "1";
          }
          if (!isReload && didSessionAutoLocateRef.current) return false;
          return true;
        })();

        const [bundle, geofenceRes] = await Promise.all([
          loadAttendanceBundle(currentMonth),
          tryAutoLocate
            ? api<GeofenceConfig>("GET", "/attendance/geofence")
            : Promise.resolve(null),
        ]);
        if (cancelled) return;

        void reloadMakeupRequests();

        if (!tryAutoLocate || !geofenceRes) return;

        autoLocateDoneRef.current = true;
        didSessionAutoLocateRef.current = true;
        sessionStorage.setItem("attendance_auto_located", "1");

        const session = ++autoPunchEpochRef.current;
        const declaredRest =
          bundle.monthly.rows.find((r) => r.date === todayKey())?.declaredRest ?? null;

        try {
          setLoc((s) => ({ ...s, attempted: true, locating: true }));
          const located = await locateWithAddress();
          if (cancelled || session !== autoPunchEpochRef.current) return;
          setLoc({ attempted: true, locating: false, ...located });

          const punchResult = await autoPunchAfterLocate({
            lat: located.lat,
            lng: located.lng,
            address: located.address,
            geofenceRes,
            shiftRes: bundle.shiftRes,
            recordsSnapshot: bundle.todayRes,
            declaredRest,
            cancelled: () => cancelled,
            session,
          });
          notifyPunchAttempt(punchResult);
        } catch {
          if (!cancelled && session === autoPunchEpochRef.current) {
            setLoc((s) => ({ ...s, locating: false, attempted: true }));
          }
        }
      } catch {
        // 401 由 api.ts 全局处理
      }
    })();

    return () => {
      cancelled = true;
      autoPunchEpochRef.current += 1;
    };
  }, [me?.id, currentMonth, loadAttendanceBundle, reloadMakeupRequests]);

  const todayTypeMap = React.useMemo(() => todayTypeMapFromRecords(records), [records]);

  const hasAnyTodayPunch = React.useMemo(
    () => punchTypes.some((t) => !!todayTypeMap[t]),
    [todayTypeMap],
  );

  const showLocationFailed = loc.attempted && !loc.locating && !loc.lat;

  async function refreshLocation() {
    const session = ++autoPunchEpochRef.current;
    setLoc((s) => ({ ...s, attempted: true, locating: true }));
    try {
      const located = await locateWithAddress();
      if (session !== autoPunchEpochRef.current) return;
      setLoc({ attempted: true, locating: false, ...located });

      const [geofenceRes, bundle] = await Promise.all([
        api<GeofenceConfig>("GET", "/attendance/geofence"),
        loadAttendanceBundle(dayjs().format("YYYY-MM")),
      ]);
      if (session !== autoPunchEpochRef.current) return;

      const declaredRest =
        bundle.monthly.rows.find((r) => r.date === todayKey())?.declaredRest ?? null;

      const punchResult = await autoPunchAfterLocate({
        lat: located.lat,
        lng: located.lng,
        address: located.address,
        geofenceRes,
        shiftRes: bundle.shiftRes,
        recordsSnapshot: bundle.todayRes,
        declaredRest,
        session,
      });
      notifyPunchAttempt(punchResult);
    } catch {
      if (session === autoPunchEpochRef.current) {
        setLoc((s) => ({ ...s, locating: false }));
      }
    }
  }

  return (
    <div className="min-h-svh bg-background p-4">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-2">
              <LiveClock />
              <div className="text-center text-sm">
                {loc.lat ? (
                  <div className={attendanceMutedTextClass}>{formatCurrentLocation(loc)}</div>
                ) : loc.locating ? (
                  <div className={attendanceMutedTextClass}>定位中…</div>
                ) : showLocationFailed ? (
                  <div className={attendanceErrorTextClass}>定位失败</div>
                ) : (
                  <div className={attendanceMutedTextClass}>尚未获取定位</div>
                )}
              </div>

              <div className="flex flex-wrap justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={loc.locating}
                  onClick={refreshLocation}
                >
                  {loc.locating ? (
                    <>
                      <Spinner data-icon="inline-start" />
                      定位中…
                    </>
                  ) : (
                    "刷新定位"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              {!hasAnyTodayPunch ? (
                <Empty className="h-full bg-muted/30">
                  <EmptyHeader>
                    <EmptyTitle>今日未打卡</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex justify-center">
                  <Timeline className="w-fit max-w-full gap-y-0">
                    {punchTypes.map((t) => {
                      const r = todayTypeMap[t];
                      if (!r) return null;
                      return (
                        <TimelineItem key={t} className="py-1">
                          <TimelineTime>{dayjs(r.punchTime).format("HH:mm")}</TimelineTime>
                          <TimelineIndicator />
                          <TimelineContent>
                            <TimelineTitle className={attendanceBrandTextClass}>
                              {ATTENDANCE_PUNCH_TYPE_LABEL[t]}
                            </TimelineTitle>
                            <TimelineDescription>
                              {r.address
                                ? r.address
                                : `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`}
                            </TimelineDescription>
                          </TimelineContent>
                        </TimelineItem>
                      );
                    })}
                  </Timeline>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4">
              {!monthSummary ? (
                <div className="grid grid-cols-3 md:grid-cols-5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="mx-auto h-5 w-12" />
                      <Skeleton className="mx-auto h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 md:grid-cols-5">
                    <div className="text-center">
                      <div className="text-sm">{formatDayCount(monthSummary.attendanceDays)}</div>
                      <div className="text-sm">出勤天数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm">{formatDayCount(monthSummary.restDays)}</div>
                      <div className="text-sm">休息天数</div>
                    </div>
                    <div className="text-center">
                      <div className={cn("text-sm", summaryMissingSlotsClass(monthSummary.missingSlots))}>
                        {monthSummary.missingSlots}
                      </div>
                      <div className="text-sm">缺卡</div>
                    </div>
                    <div className="text-center">
                      <div className={cn("text-sm", summaryOvertimeClass(monthSummary.overtimeStr))}>
                        {hasOvertime(monthSummary.overtimeStr) ? monthSummary.overtimeStr : "0"}
                      </div>
                      <div className="text-sm">加班</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm">{formatDayCount(monthSummary.remainingLeave ?? 0)}</div>
                      <div className="text-sm">剩余假期</div>
                    </div>
                  </div>

                  <ScrollArea>
                    <div className="min-w-[660px]">
                      <Table className="w-full table-fixed">
                    <TableHeader className={attendanceTableHeaderClass}>
                      <TableRow>
                        <TableHead className="w-1/5 text-center">日期</TableHead>
                        <TableHead className="w-1/5 text-center">上午上班</TableHead>
                        <TableHead className="w-1/5 text-center">上午下班</TableHead>
                        <TableHead className="w-1/5 text-center">下午上班</TableHead>
                        <TableHead className="w-1/5 text-center">下午下班</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthSummary.rows.map((r) => (
                        <TableRow key={r.date}>
                          <TableCell className="w-1/5 text-center">{dayOfMonth(r.date)}</TableCell>
                          <TableCell
                            className={cn(
                              "w-1/5 text-center",
                              attendanceInCellClass(r, "morning", r.morningIn),
                            )}
                          >
                            <AttendanceInCell
                              row={r}
                              half="morning"
                              time={r.morningIn}
                              makeupRequests={makeupRequests}
                              makeupTodayGate={makeupTodayGate}
                              onDeclare={() =>
                                setRestDialog({
                                  date: r.date,
                                  half: "morning",
                                  mode: "declare",
                                  declaredRest: r.declaredRest,
                                })
                              }
                              onClear={() =>
                                setRestDialog({
                                  date: r.date,
                                  half: "morning",
                                  mode: "clear",
                                  declaredRest: r.declaredRest,
                                })
                              }
                              onMakeup={(type) => setMakeupDialog({ date: r.date, type })}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              "w-1/5 text-center",
                              attendanceOutCellClass(r, "morning", r.morningOut, cellClassOptions),
                            )}
                          >
                            <AttendanceHalfOutCell
                              row={r}
                              half="morning"
                              type="morning_out"
                              time={r.morningOut}
                              makeupRequests={makeupRequests}
                              makeupTodayGate={makeupTodayGate}
                              onApply={() => setMakeupDialog({ date: r.date, type: "morning_out" })}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              "w-1/5 text-center",
                              attendanceInCellClass(r, "afternoon", r.afternoonIn),
                            )}
                          >
                            <AttendanceInCell
                              row={r}
                              half="afternoon"
                              time={r.afternoonIn}
                              makeupRequests={makeupRequests}
                              makeupTodayGate={makeupTodayGate}
                              onDeclare={() =>
                                setRestDialog({
                                  date: r.date,
                                  half: "afternoon",
                                  mode: "declare",
                                  declaredRest: r.declaredRest,
                                })
                              }
                              onClear={() =>
                                setRestDialog({
                                  date: r.date,
                                  half: "afternoon",
                                  mode: "clear",
                                  declaredRest: r.declaredRest,
                                })
                              }
                              onMakeup={(type) => setMakeupDialog({ date: r.date, type })}
                            />
                          </TableCell>
                          <TableCell
                            className={cn(
                              "w-1/5 text-center",
                              attendanceOutCellClass(r, "afternoon", r.afternoonOut, cellClassOptions),
                            )}
                          >
                            <AttendanceHalfOutCell
                              row={r}
                              half="afternoon"
                              type="afternoon_out"
                              time={r.afternoonOut}
                              makeupRequests={makeupRequests}
                              makeupTodayGate={makeupTodayGate}
                              onApply={() =>
                                setMakeupDialog({ date: r.date, type: "afternoon_out" })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {makeupDialog ? (
        <MakeupRequestDialog
          open
          onOpenChange={(open) => {
            if (!open) setMakeupDialog(null);
          }}
          date={makeupDialog.date}
          type={makeupDialog.type}
          onSuccess={() => {
            void reloadAfterMutation();
          }}
        />
      ) : null}

      {restDialog ? (
        <RestActionDialog
          open
          onOpenChange={(open) => {
            if (!open) setRestDialog(null);
          }}
          date={restDialog.date}
          half={restDialog.half}
          mode={restDialog.mode}
          declaredRest={restDialog.declaredRest}
          onSuccess={() => {
            void reloadAfterMutation();
          }}
        />
      ) : null}
    </div>
  );
}
