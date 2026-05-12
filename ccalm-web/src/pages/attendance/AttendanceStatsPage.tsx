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
import type { AttendanceMonthlySummary } from "@/lib/attendance/types";
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

type UserAgg = {
  userId: string;
  userName: string;
  attendanceDays: number;
  restDays: number;
  missingSlots: number;
  overtimeStr: string;
  rows: Array<{
    date: string;
    morningIn: string | null;
    morningOut: string | null;
    afternoonIn: string | null;
    afternoonOut: string | null;
    overtimeMinutes: number;
    overtimeStr: string;
  }>;
};

export function AttendanceStatsPage() {
  const [month, setMonth] = React.useState(() => currentMonth());
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [summary, setSummary] = React.useState<UserAgg[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const me = await api<{
          id: string;
          role: "user" | "admin";
          displayName: string;
          username: string;
        }>("GET", "/auth/me");

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

          const out = await Promise.all(tasks);
          if (cancelled) return;
          setSummary(out);
          return;
        }

        const s = await api<AttendanceMonthlySummary>(
          "GET",
          `/attendance/summary/monthly?month=${month}`,
        );
        if (cancelled) return;
        setSummary([
          {
            userId: me.id,
            userName: me.displayName || me.username,
            attendanceDays: s.attendanceDays,
            restDays: s.restDays,
            missingSlots: s.missingSlots,
            overtimeStr: s.overtimeStr,
            rows: s.rows,
          },
        ]);
      } catch (e) {
        if (cancelled) return;
        const msg = errorMessage(e);
        setError(msg);
        const status =
          typeof e === "object" && e && "status" in e ? (e as ApiError).status : undefined;
        if (status === 401) {
          window.location.href = "/login";
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const columns = React.useMemo<Array<ColumnDef<UserAgg>>>(() => {
    return [
      { header: "姓名", accessorKey: "userName" },
      { header: "出勤天数", accessorKey: "attendanceDays" },
      { header: "休息天数", accessorKey: "restDays" },
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
                                  <TableCell
                                    className={cn(
                                      "w-1/6 px-3 py-2",
                                      r.morningIn ? "" : "text-destructive",
                                    )}
                                  >
                                    {r.morningIn ?? ""}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "w-1/6 px-3 py-2",
                                      r.morningOut ? "" : "text-destructive",
                                    )}
                                  >
                                    {r.morningOut ?? ""}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "w-1/6 px-3 py-2",
                                      r.afternoonIn ? "" : "text-destructive",
                                    )}
                                  >
                                    {r.afternoonIn ?? ""}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "w-1/6 px-3 py-2",
                                      r.afternoonOut ? "" : "text-destructive",
                                    )}
                                  >
                                    {r.afternoonOut ?? ""}
                                  </TableCell>
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
    </div>
  );
}
