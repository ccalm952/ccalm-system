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
import { monthKey, previousMonthKey, type BackendShiftDto } from "@/lib/attendance/shift";
import { canDeclareRest, isHalfScheduleRest, type RestHalf } from "@/lib/attendance/rest";
import { formatDayCount } from "@/lib/attendance/summary";
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

function inCellClass(row: AttendancePunchDayRow, half: RestHalf, time: string | null): string {
  if (time) return "";
  if (isHalfScheduleRest(row.scheduleRest, half)) return "text-muted-foreground";
  if (canDeclareRest(row, half)) return "";
  return "text-destructive";
}

function outCellClass(row: AttendancePunchDayRow, half: RestHalf, time: string | null): string {
  if (isHalfScheduleRest(row.scheduleRest, half)) return "text-muted-foreground";
  if (time) return "";
  return "text-destructive";
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
  const pendingMakeupRequests = await loadPendingMakeupRequests(me.role === "admin");

  if (me.role === "admin") {
    const summary = await api<UserAgg[]>(
      "GET",
      `/attendance/summary/monthly-all?month=${month}`,
    );
    return { isAdmin: true, summary, pendingMakeupRequests };
  }

  const s = await api<AttendanceMonthlySummary>(
    "GET",
    `/attendance/summary/monthly?month=${month}`,
  );
  return {
    isAdmin: false,
    summary: [
      {
        userId: me.id,
        userName: me.displayName || me.username,
        attendanceDays: s.attendanceDays,
        restDays: s.restDays,
        missingSlots: s.missingSlots,
        overtimeStr: s.overtimeStr,
        rows: s.rows,
      },
    ],
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
  const [, setGateTick] = React.useState(0);

  React.useEffect(() => {
    const id = window.setInterval(() => setGateTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

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
      { header: "缺卡", accessorKey: "missingSlots" },
      {
        header: "加班",
        accessorKey: "overtimeStr",
        cell: ({ getValue }) => {
          const v = String(getValue() ?? "");
          return v === "-" ? "" : v;
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
              className="h-auto px-0"
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

        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        <div className="overflow-x-auto rounded-md border border-border">
          <Table className="min-w-[860px]">
            <TableHeader className="bg-muted/40 text-muted-foreground">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className="w-1/6 px-3 py-2">
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
                      <TableCell key={cell.id} className="w-1/6 px-3 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {row.getIsExpanded() ? (
                    <TableRow className="border-t border-border bg-muted/10">
                      <TableCell className="p-0" colSpan={row.getVisibleCells().length}>
                        <ScrollArea className="h-[360px] bg-background">
                          <Table className="min-w-[760px]">
                            <TableHeader className="bg-muted/40 text-muted-foreground">
                              <TableRow>
                                <TableHead className="w-1/6 px-3 py-2">日期</TableHead>
                                <TableHead className="w-1/6 px-3 py-2">上午上班</TableHead>
                                <TableHead className="w-1/6 px-3 py-2">上午下班</TableHead>
                                <TableHead className="w-1/6 px-3 py-2">下午上班</TableHead>
                                <TableHead className="w-1/6 px-3 py-2">下午下班</TableHead>
                                <TableHead className="w-1/6 px-3 py-2">加班时长</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {row.original.rows.map((r) => {
                                const rowUserId = row.original.userId;
                                const rowUserName = row.original.userName;
                                const manageable = canManageRow(me, rowUserId, isAdmin);
                                const adminDirectMakeup = isAdmin;
                                const userRequests = pendingMakeupRequests.filter(
                                  (item) => item.userId === rowUserId,
                                );

                                return (
                                  <TableRow key={r.date} className="border-t border-border">
                                    <TableCell className="w-1/6 px-3 py-2">
                                      {dayOfMonth(r.date)}
                                    </TableCell>
                                    <TableCell
                                      className={cn(
                                        "w-1/6 px-3 py-2 text-center",
                                        inCellClass(r, "morning", r.morningIn),
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
                                              scheduleRest: r.scheduleRest,
                                            })
                                          }
                                          onClear={() =>
                                            setRestDialog({
                                              userId: rowUserId,
                                              userName: rowUserName,
                                              date: r.date,
                                              half: "morning",
                                              mode: "clear",
                                              scheduleRest: r.scheduleRest,
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
                                        "w-1/6 px-3 py-2 text-center",
                                        outCellClass(r, "morning", r.morningOut),
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
                                        "w-1/6 px-3 py-2 text-center",
                                        inCellClass(r, "afternoon", r.afternoonIn),
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
                                              scheduleRest: r.scheduleRest,
                                            })
                                          }
                                          onClear={() =>
                                            setRestDialog({
                                              userId: rowUserId,
                                              userName: rowUserName,
                                              date: r.date,
                                              half: "afternoon",
                                              mode: "clear",
                                              scheduleRest: r.scheduleRest,
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
                                        "w-1/6 px-3 py-2 text-center",
                                        outCellClass(r, "afternoon", r.afternoonOut),
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
                                    <TableCell className="w-1/6 px-3 py-2 text-muted-foreground">
                                      {r.overtimeStr === "-" ? "" : r.overtimeStr}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
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

        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <span>当前月份：{month}</span>
          <span>渲染时间：{dayjs().format("YYYY-MM-DD HH:mm:ss")}</span>
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
