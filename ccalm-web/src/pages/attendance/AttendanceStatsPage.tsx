import * as React from "react";
import dayjs from "dayjs";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
} from "@tanstack/react-table";

import { MakeupRequestDialog } from "@/components/makeup-request-dialog";
import { AttendanceHalfOutCell } from "@/components/attendance-half-out-cell";
import { AttendanceInCell } from "@/components/attendance-in-cell";
import { RestActionDialog } from "@/components/rest-action-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EmployeeMakeupType, MakeupTodayGate } from "@/lib/attendance/makeup";
import { makeupTodayGateFromShift } from "@/lib/attendance/makeup";
import {
  attendanceInCellClass,
  attendanceOutCellClass,
  type AttendanceCellClassOptions,
} from "@/lib/attendance/cell-class";
import {
  attendanceErrorTextClass,
  attendanceExpandedRowClass,
  attendanceMutedTextClass,
  attendanceStatsTableColumnClass,
  attendanceTableHeaderClass,
  detailOvertimeClass,
  hasOvertime,
  summaryMissingSlotsClass,
  summaryOvertimeClass,
  tableActionLinkClass,
} from "@/lib/attendance/attendance-theme";
import { monthKey, previousMonthKey, type BackendShiftDto } from "@/lib/attendance/shift";
import type { RestHalf } from "@/lib/attendance/rest";
import { formatDayCount, todayKey } from "@/lib/attendance/summary";
import type {
  AttendanceMakeupRequest,
  AttendanceMonthlySummary,
  AttendancePunchDayRow,
} from "@/lib/attendance/types";
import { api } from "@/lib/api";
import type { AuthMe } from "@/lib/auth";
import { useAuth } from "@/lib/use-auth";
import { errorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";

function dayOfMonth(date: string): string {
  const d = dayjs(date);
  return d.isValid() ? String(d.date()) : date;
}

function canManageRow(me: AuthMe | null, rowUserId: string, isAdmin: boolean): boolean {
  return !!me && (me.id === rowUserId || isAdmin);
}

type UserAgg = {
  userId: string;
  userName: string;
  attendanceDays: number;
  restDays: number;
  missingSlots: number;
  overtimeStr: string;
  rows: AttendanceMonthlySummary["rows"];
};

async function loadPendingMakeupRequests(isAdmin: boolean): Promise<AttendanceMakeupRequest[]> {
  if (isAdmin) {
    return await api<AttendanceMakeupRequest[]>(
      "GET",
      "/attendance/makeup-requests?status=pending",
    );
  }
  const list = await api<AttendanceMakeupRequest[]>("GET", "/attendance/makeup-requests/mine");
  return list.filter((item) => item.status === "pending");
}

async function loadSummary(
  month: string,
  me: AuthMe,
): Promise<{
  isAdmin: boolean;
  summary: UserAgg[];
  pendingMakeupRequests: AttendanceMakeupRequest[];
}> {
  const isAdmin = me.role === "admin";

  const [pendingMakeupRequests, summaryResult] = await Promise.all([
    loadPendingMakeupRequests(isAdmin),
    isAdmin
      ? api<UserAgg[]>("GET", `/attendance/summary/monthly-all?month=${month}`)
      : api<AttendanceMonthlySummary>(
          "GET",
          `/attendance/summary/monthly?month=${month}`,
        ).then((s) => [
          {
            userId: me.id,
            userName: me.displayName || me.username,
            attendanceDays: s.attendanceDays,
            restDays: s.restDays,
            missingSlots: s.missingSlots,
            overtimeStr: s.overtimeStr,
            rows: s.rows,
          },
        ]),
  ]);

  return {
    isAdmin,
    summary: summaryResult,
    pendingMakeupRequests,
  };
}

export function AttendanceStatsPage() {
  const { me } = useAuth();
  const [month, setMonth] = React.useState(() => monthKey());
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [summary, setSummary] = React.useState<UserAgg[] | null>(null);
  const [pendingMakeupRequests, setPendingMakeupRequests] = React.useState<
    AttendanceMakeupRequest[]
  >([]);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [makeupDialog, setMakeupDialog] = React.useState<{
    userId: string;
    userName: string;
    date: string;
    type: EmployeeMakeupType;
  } | null>(null);
  const [restDialog, setRestDialog] = React.useState<{
    userId: string;
    userName: string;
    date: string;
    half: RestHalf;
    mode: "declare" | "clear";
    scheduleRest?: AttendancePunchDayRow["scheduleRest"];
  } | null>(null);
  const [makeupTodayGate, setMakeupTodayGate] = React.useState<MakeupTodayGate | undefined>();
  const [shift, setShift] = React.useState<BackendShiftDto | null>(null);
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

  const pendingByUserId = React.useMemo(() => {
    const map = new Map<string, AttendanceMakeupRequest[]>();
    for (const item of pendingMakeupRequests) {
      const list = map.get(item.userId) ?? [];
      list.push(item);
      map.set(item.userId, list);
    }
    return map;
  }, [pendingMakeupRequests]);

  const reload = React.useCallback(async () => {
    if (!me) return;
    try {
      setError(null);
      const [result, shiftRes] = await Promise.all([
        loadSummary(month, me),
        api<BackendShiftDto>("GET", "/attendance/shift"),
      ]);
      setIsAdmin(result.isAdmin);
      setSummary(result.summary);
      setPendingMakeupRequests(result.pendingMakeupRequests);
      setShift(shiftRes);
      setMakeupTodayGate(makeupTodayGateFromShift(shiftRes));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [month, me]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const columns = React.useMemo<Array<ColumnDef<UserAgg>>>(() => {
    return [
      { header: "姓名", accessorKey: "userName" },
      {
        header: "出勤天数",
        accessorKey: "attendanceDays",
        cell: ({ getValue }) => formatDayCount(Number(getValue() ?? 0)),
      },
      {
        header: "休息天数",
        accessorKey: "restDays",
        cell: ({ getValue }) => formatDayCount(Number(getValue() ?? 0)),
      },
      {
        header: "缺卡",
        accessorKey: "missingSlots",
        cell: ({ getValue }) => {
          const n = Number(getValue() ?? 0);
          return <span className={summaryMissingSlotsClass(n)}>{n}</span>;
        },
      },
      {
        header: "加班",
        accessorKey: "overtimeStr",
        cell: ({ getValue }) => {
          const v = String(getValue() ?? "");
          if (!hasOvertime(v)) return "";
          return <span className={summaryOvertimeClass(v)}>{v}</span>;
        },
      },
      {
        id: "detail",
        header: "明细",
        cell: ({ row }) => {
          const canExpand = row.original.rows.length > 0;
          return (
            <Button
              type="button"
              variant="link"
              className={tableActionLinkClass}
              disabled={!canExpand}
              onClick={(e) => {
                e.stopPropagation();
                row.toggleExpanded();
              }}
            >
              {row.getIsExpanded() ? "收起" : "展开"}
            </Button>
          );
        },
      },
    ];
  }, []);

  const table = useReactTable({
    data: summary ?? [],
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: (row) => row.original.rows.length > 0,
  });

  return (
    <div className="min-h-svh bg-background p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant={month === monthKey() ? "secondary" : "ghost"}
            onClick={() => setMonth(monthKey())}
          >
            本月
          </Button>
          <Button
            type="button"
            variant={month === previousMonthKey() ? "secondary" : "ghost"}
            onClick={() => setMonth(previousMonthKey())}
          >
            上个月
          </Button>
        </div>

        {error ? <div className={cn("text-sm", attendanceErrorTextClass)}>{error}</div> : null}

        <div className="overflow-x-auto rounded-md border border-border">
          <Table className="min-w-[860px] table-fixed">
            <TableHeader className={attendanceTableHeaderClass}>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className={attendanceStatsTableColumnClass}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    className={cn(
                      "border-t border-border",
                      row.getCanExpand() ? "cursor-pointer" : "",
                    )}
                    onClick={row.getCanExpand() ? () => row.toggleExpanded() : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={attendanceStatsTableColumnClass}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() ? (
                    <TableRow className={cn("border-t border-border", attendanceExpandedRowClass)}>
                      <TableCell className="p-0" colSpan={row.getVisibleCells().length}>
                        <ScrollArea className="h-[360px] bg-background">
                          <table className="w-full min-w-[860px] table-fixed caption-bottom text-sm">
                            <TableHeader className={attendanceTableHeaderClass}>
                              <TableRow>
                                <TableHead className={attendanceStatsTableColumnClass}>日期</TableHead>
                                <TableHead className={attendanceStatsTableColumnClass}>上午上班</TableHead>
                                <TableHead className={attendanceStatsTableColumnClass}>上午下班</TableHead>
                                <TableHead className={attendanceStatsTableColumnClass}>下午上班</TableHead>
                                <TableHead className={attendanceStatsTableColumnClass}>下午下班</TableHead>
                                <TableHead className={attendanceStatsTableColumnClass}>加班时长</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {row.original.rows.map((r) => {
                                const rowUserId = row.original.userId;
                                const rowUserName = row.original.userName;
                                const manageable = canManageRow(me, rowUserId, isAdmin);
                                const adminDirectMakeup = isAdmin;
                                const userRequests = pendingByUserId.get(rowUserId) ?? [];

                                return (
                                  <TableRow key={r.date} className="border-t border-border">
                                    <TableCell className={attendanceStatsTableColumnClass}>
                                      {dayOfMonth(r.date)}
                                    </TableCell>
                                    <TableCell
                                      className={cn(
                                        attendanceStatsTableColumnClass,
                                        attendanceInCellClass(r, "morning", r.morningIn),
                                      )}
                                    >
                                      {manageable ? (
                                        <AttendanceInCell
                                          row={r}
                                          half="morning"
                                          time={r.morningIn}
                                          makeupRequests={userRequests}
                                          makeupTodayGate={makeupTodayGate}
                                          onDeclare={() =>
                                            setRestDialog({
                                              userId: rowUserId,
                                              userName: rowUserName,
                                              date: r.date,
                                              half: "morning",
                                              mode: "declare",
                                              scheduleRest: r.declaredRest,
                                            })
                                          }
                                          onClear={() =>
                                            setRestDialog({
                                              userId: rowUserId,
                                              userName: rowUserName,
                                              date: r.date,
                                              half: "morning",
                                              mode: "clear",
                                              scheduleRest: r.declaredRest,
                                            })
                                          }
                                          onMakeup={(type) =>
                                            setMakeupDialog({
                                              userId: rowUserId,
                                              userName: rowUserName,
                                              date: r.date,
                                              type,
                                            })
                                          }
                                        />
                                      ) : (
                                        (r.morningIn ?? "—")
                                      )}
                                    </TableCell>
                                    <TableCell
                                      className={cn(
                                        attendanceStatsTableColumnClass,
                                        attendanceOutCellClass(r, "morning", r.morningOut, cellClassOptions),
                                      )}
                                    >
                                      {manageable ? (
                                        <AttendanceHalfOutCell
                                          row={r}
                                          half="morning"
                                          type="morning_out"
                                          time={r.morningOut}
                                          makeupRequests={userRequests}
                                          makeupTodayGate={makeupTodayGate}
                                          adminDirect={adminDirectMakeup}
                                          onApply={() =>
                                            setMakeupDialog({
                                              userId: rowUserId,
                                              userName: rowUserName,
                                              date: r.date,
                                              type: "morning_out",
                                            })
                                          }
                                        />
                                      ) : (
                                        (r.morningOut ?? "—")
                                      )}
                                    </TableCell>
                                    <TableCell
                                      className={cn(
                                        attendanceStatsTableColumnClass,
                                        attendanceInCellClass(r, "afternoon", r.afternoonIn),
                                      )}
                                    >
                                      {manageable ? (
                                        <AttendanceInCell
                                          row={r}
                                          half="afternoon"
                                          time={r.afternoonIn}
                                          makeupRequests={userRequests}
                                          makeupTodayGate={makeupTodayGate}
                                          onDeclare={() =>
                                            setRestDialog({
                                              userId: rowUserId,
                                              userName: rowUserName,
                                              date: r.date,
                                              half: "afternoon",
                                              mode: "declare",
                                              scheduleRest: r.declaredRest,
                                            })
                                          }
                                          onClear={() =>
                                            setRestDialog({
                                              userId: rowUserId,
                                              userName: rowUserName,
                                              date: r.date,
                                              half: "afternoon",
                                              mode: "clear",
                                              scheduleRest: r.declaredRest,
                                            })
                                          }
                                          onMakeup={(type) =>
                                            setMakeupDialog({
                                              userId: rowUserId,
                                              userName: rowUserName,
                                              date: r.date,
                                              type,
                                            })
                                          }
                                        />
                                      ) : (
                                        (r.afternoonIn ?? "—")
                                      )}
                                    </TableCell>
                                    <TableCell
                                      className={cn(
                                        attendanceStatsTableColumnClass,
                                        attendanceOutCellClass(r, "afternoon", r.afternoonOut, cellClassOptions),
                                      )}
                                    >
                                      {manageable ? (
                                        <AttendanceHalfOutCell
                                          row={r}
                                          half="afternoon"
                                          type="afternoon_out"
                                          time={r.afternoonOut}
                                          makeupRequests={userRequests}
                                          makeupTodayGate={makeupTodayGate}
                                          adminDirect={adminDirectMakeup}
                                          onApply={() =>
                                            setMakeupDialog({
                                              userId: rowUserId,
                                              userName: rowUserName,
                                              date: r.date,
                                              type: "afternoon_out",
                                            })
                                          }
                                        />
                                      ) : (
                                        (r.afternoonOut ?? "—")
                                      )}
                                    </TableCell>
                                    <TableCell
                                      className={cn(
                                        attendanceStatsTableColumnClass,
                                        detailOvertimeClass(r.overtimeStr),
                                      )}
                                    >
                                      {hasOvertime(r.overtimeStr) ? r.overtimeStr : ""}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </table>
                          <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className={cn("text-xs", attendanceMutedTextClass)}>
          <span>当前月份：{month}</span>
        </div>
      </div>

      {makeupDialog ? (
        <MakeupRequestDialog
          open
          mode={isAdmin ? "direct" : "request"}
          userId={makeupDialog.userId}
          userName={makeupDialog.userName}
          onOpenChange={(open) => {
            if (!open) setMakeupDialog(null);
          }}
          date={makeupDialog.date}
          type={makeupDialog.type}
          onSuccess={() => {
            void reload();
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
          scheduleRest={restDialog.scheduleRest}
          userId={
            isAdmin && me?.id !== restDialog.userId ? restDialog.userId : undefined
          }
          userName={
            isAdmin && me?.id !== restDialog.userId ? restDialog.userName : undefined
          }
          onSuccess={() => {
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}
