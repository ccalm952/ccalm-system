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
import type { AdminMakeupType } from "@/lib/attendance/makeup";
import { punchSlotState } from "@/lib/attendance/makeup";
import { formatDayCount } from "@/lib/attendance/summary";
import type {
  AttendanceMakeupRequest,
  AttendanceMonthlySummary,
  AttendancePunchDayRow,
} from "@/lib/attendance/types";
import { api, type ApiError } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function lastMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function dayOfMonth(date: string): string {
  const d = dayjs(date);
  return d.isValid() ? String(d.date()) : date;
}

function slotRestLabel(
  row: AttendancePunchDayRow,
  type: AdminMakeupType,
): string | null {
  const scheduleRest = row.scheduleRest ?? null;
  if (!scheduleRest) return null;
  if (
    (type === "morning_in" || type === "morning_out") &&
    (scheduleRest === "morning_rest" || scheduleRest === "full_rest")
  ) {
    return type === "morning_out" ? "—" : "休";
  }
  if (
    (type === "afternoon_in" || type === "afternoon_out") &&
    (scheduleRest === "afternoon_rest" || scheduleRest === "full_rest")
  ) {
    return type === "afternoon_out" ? "—" : "休";
  }
  return null;
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

const PUNCH_DETAIL_COLUMNS: Array<{
  type: AdminMakeupType;
  getTime: (row: AttendancePunchDayRow) => string | null;
}> = [
  { type: "morning_in", getTime: (row) => row.morningIn },
  { type: "morning_out", getTime: (row) => row.morningOut },
  { type: "afternoon_in", getTime: (row) => row.afternoonIn },
  { type: "afternoon_out", getTime: (row) => row.afternoonOut },
];

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

async function loadSummary(month: string): Promise<{
  isAdmin: boolean;
  summary: UserAgg[];
  pendingMakeupRequests: AttendanceMakeupRequest[];
}> {
  const me = await api<{
    id: string;
    role: "user" | "admin";
    displayName: string;
    username: string;
  }>("GET", "/auth/me");

  const pendingMakeupRequests = await loadPendingMakeupRequests(me.role === "admin");

  if (me.role === "admin") {
    const users = await api<Array<{ id: string; displayName: string; username: string }>>(
      "GET",
      "/users",
    );
    const tasks = users.map(async (u) => {
      const s = await api<AttendanceMonthlySummary>(
        "GET",
        `/attendance/summary/monthly?month=${month}&userId=${u.id}`,
      );
      return {
        userId: u.id,
        userName: u.displayName || u.username,
        attendanceDays: s.attendanceDays,
        restDays: s.restDays,
        missingSlots: s.missingSlots,
        overtimeStr: s.overtimeStr,
        rows: s.rows,
      } satisfies UserAgg;
    });
    return { isAdmin: true, summary: await Promise.all(tasks), pendingMakeupRequests };
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

function StatsPunchCell(props: {
  row: AttendancePunchDayRow;
  type: AdminMakeupType;
  time: string | null;
  makeupRequests: AttendanceMakeupRequest[];
  adminDirect: boolean;
  onApply?: () => void;
}) {
  const { row, type, time, makeupRequests, adminDirect, onApply } = props;
  if (time) return <span>{time}</span>;

  const slotState = punchSlotState(row, type, makeupRequests, adminDirect);
  if (slotState === "pending") {
    return <span className="text-sm text-muted-foreground">审批中</span>;
  }
  if (slotState === "apply" && onApply) {
    return (
      <Button type="button" variant="link" className="h-auto px-0 text-sm" onClick={onApply}>
        补卡
      </Button>
    );
  }
  return null;
}

export function AttendanceStatsPage() {
  const [month, setMonth] = React.useState(() => currentMonth());
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
    type: AdminMakeupType;
  } | null>(null);

  const reload = React.useCallback(async () => {
    try {
      setError(null);
      const result = await loadSummary(month);
      setIsAdmin(result.isAdmin);
      setSummary(result.summary);
      setPendingMakeupRequests(result.pendingMakeupRequests);
    } catch (e) {
      const msg = errorMessage(e);
      setError(msg);
      const status =
        typeof e === "object" && e && "status" in e ? (e as ApiError).status : undefined;
      if (status === 401) {
        window.location.href = "/login";
      }
    }
  }, [month]);

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
            variant={month === currentMonth() ? "secondary" : "ghost"}
            onClick={() => setMonth(currentMonth())}
          >
            本月
          </Button>
          <Button
            type="button"
            variant={month === lastMonth() ? "secondary" : "ghost"}
            onClick={() => setMonth(lastMonth())}
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
                              {row.original.rows.map((r) => (
                                <TableRow key={r.date} className="border-t border-border">
                                  <TableCell className="w-1/6 px-3 py-2">{dayOfMonth(r.date)}</TableCell>
                                  {PUNCH_DETAIL_COLUMNS.map((col) => {
                                    const time = col.getTime(r);
                                    const restLabel = slotRestLabel(r, col.type);
                                    const userRequests = pendingMakeupRequests.filter(
                                      (item) => item.userId === row.original.userId,
                                    );
                                    return (
                                      <TableCell
                                        key={col.type}
                                        className={cn(
                                          "w-1/6 px-3 py-2 text-center",
                                          time ? "" : restLabel ? "text-muted-foreground" : "text-destructive",
                                        )}
                                      >
                                        {restLabel ? (
                                          restLabel
                                        ) : (
                                          <StatsPunchCell
                                            row={r}
                                            type={col.type}
                                            time={time}
                                            makeupRequests={userRequests}
                                            adminDirect={isAdmin}
                                            onApply={
                                              isAdmin
                                                ? () =>
                                                    setMakeupDialog({
                                                      userId: row.original.userId,
                                                      userName: row.original.userName,
                                                      date: r.date,
                                                      type: col.type,
                                                    })
                                                : undefined
                                            }
                                          />
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell className="w-1/6 px-3 py-2 text-muted-foreground">
                                    {r.overtimeStr === "-" ? "" : r.overtimeStr}
                                  </TableCell>
                                </TableRow>
                              ))}
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
          mode="direct"
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
    </div>
  );
}
