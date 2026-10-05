import * as React from "react";
import dayjs from "dayjs";
import { ChevronLeftIcon, ChevronRightIcon, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pad2 } from "@/lib/attendance/shift";
import { formatDayCount } from "@/lib/attendance/summary";
import type { ChinaHolidayYear } from "@/lib/attendance/holidays";
import { formatHolidayRange } from "@/lib/attendance/holidays";
import type { ScheduleMonthData } from "@/lib/attendance/schedule";
import {
  clampScheduleMonth,
  scheduleMonthRange,
} from "@/lib/attendance/schedule";
import {
  attendanceMutedTextClass,
  SCHEDULE_SHIFT_LEGEND,
  SCHEDULE_SHIFT_SWATCH_CLASS,
} from "@/lib/attendance/attendance-theme";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { errorMessage } from "@/lib/errorMessage";
import { cn } from "cn";
import { toast } from "sonner";

import { ScheduleUsersTable } from "./ScheduleUsersTable";

type LeaveBalanceDraft = {
  userId: string;
  userName: string;
  value: string;
};

const LEAVE_OFFSET_DRAFT = /^\d*\.?\d*$/;
const LEAVE_BALANCE_DRAFT = /^-?\d*\.?\d*$/;

function LeaveOffsetInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (days: number) => void;
}) {
  const [draft, setDraft] = React.useState(String(value));
  const focusedRef = React.useRef(false);

  React.useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  return (
    <Input
      inputMode="decimal"
      value={draft}
      className="h-8 border-border/80 bg-muted/40 px-1 text-center tabular-nums dark:border-white/20 dark:bg-muted"
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "" || LEAVE_OFFSET_DRAFT.test(next)) setDraft(next);
      }}
      onBlur={() => {
        focusedRef.current = false;
        const days = Number(draft);
        const safe = Number.isFinite(days) && days >= 0 ? days : 0;
        setDraft(String(safe));
        if (safe === value) return;
        onCommit(safe);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

export function SchedulePage() {
  const { me } = useAuth();
  const { minMonth, maxMonth } = React.useMemo(() => scheduleMonthRange(), []);
  const [month, setMonth] = React.useState(() =>
    clampScheduleMonth(dayjs().format("YYYY-MM")),
  );
  const [data, setData] = React.useState<ScheduleMonthData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const loadSeqRef = React.useRef(0);
  const hasDataRef = React.useRef(false);
  const [monthAllowanceInput, setMonthAllowanceInput] = React.useState("0");
  const [savingAllowance, setSavingAllowance] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [leaveDraft, setLeaveDraft] = React.useState<LeaveBalanceDraft[]>([]);
  const [savingLeave, setSavingLeave] = React.useState(false);
  const leaveSaveSeq = React.useRef<Record<string, number>>({});
  const [holidaysByYear, setHolidaysByYear] = React.useState<
    Record<string, ChinaHolidayYear>
  >({});

  const isAdmin = me?.role === "admin";
  const year = month.split("-")[0] ?? dayjs().format("YYYY");
  const holidays = holidaysByYear[year] ?? null;

  const load = React.useCallback(async (targetMonth: string) => {
    const seq = ++loadSeqRef.current;
    if (!hasDataRef.current) {
      setLoading(true);
    }

    try {
      const res = await api<ScheduleMonthData>(
        "GET",
        `/attendance/schedule?month=${targetMonth}`,
      );
      if (seq !== loadSeqRef.current) return;
      hasDataRef.current = true;
      setData(res);
      setMonthAllowanceInput(String(res.monthAllowance));
    } catch (e) {
      if (seq !== loadSeqRef.current) return;
      toast.error(errorMessage(e));
      if (!hasDataRef.current) setData(null);
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  React.useEffect(() => {
    void load(month);
  }, [load, month]);

  React.useEffect(() => {
    if (holidaysByYear[year]) return;
    let cancelled = false;
    void api<ChinaHolidayYear>("GET", `/attendance/holidays?year=${year}`)
      .then((res) => {
        if (!cancelled) {
          setHolidaysByYear((prev) => ({ ...prev, [year]: res }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHolidaysByYear((prev) => ({
            ...prev,
            [year]: {
              year: Number(year),
              periods: [],
              makeupDays: [],
              offDayMap: {},
            },
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [year, holidaysByYear]);

  function holidayDateKey(day: number): string {
    return `${month}-${pad2(day)}`;
  }

  function openLeaveSettings() {
    if (!data) return;
    setLeaveDraft(
      data.users.map((user) => ({
        userId: user.userId,
        userName: user.userName,
        value: String(user.leaveInitialBalance),
      })),
    );
    setSettingsOpen(true);
  }

  async function saveLeaveSettings() {
    const parsed = leaveDraft.map((row) => ({
      ...row,
      days: row.value === "" ? 0 : Number(row.value),
    }));
    if (parsed.some((row) => !Number.isFinite(row.days))) {
      toast.error("初始假期额度须为数字");
      return;
    }
    setSavingLeave(true);
    try {
      await Promise.all(
        parsed.map((row) => {
          const current = data?.users.find(
            (user) => user.userId === row.userId,
          )?.leaveInitialBalance;
          if (row.days === current) return Promise.resolve();
          return api("PATCH", `/users/${row.userId}`, {
            leaveInitialBalance: row.days,
          });
        }),
      );
      toast.success("已保存初始假期额度");
      setSettingsOpen(false);
      await load(month);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSavingLeave(false);
    }
  }

  async function saveLeaveOffset(userId: string, days: number) {
    const seq = (leaveSaveSeq.current[userId] ?? 0) + 1;
    leaveSaveSeq.current[userId] = seq;
    try {
      const res = await api<{
        days: number;
        salary: "applied" | "missing_sheet" | "missing_employee";
      }>("PUT", "/attendance/schedule/leave-offset", { month, userId, days });
      if (leaveSaveSeq.current[userId] !== seq) return;
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.map((user) => {
            if (user.userId !== userId) return user;
            const previous = user.leaveOffsetDays;
            return {
              ...user,
              leaveOffsetDays: res.days,
              remainingLeave: user.remainingLeave + (res.days - previous),
            };
          }),
        };
      });
      if (res.salary === "applied") {
        toast.success("已填入员工薪资假期");
      } else if (res.salary === "missing_sheet") {
        toast.success("已保存，该月还没有薪资表");
      } else {
        toast.success("已保存，薪资表里没有同名员工");
      }
    } catch (e) {
      if (leaveSaveSeq.current[userId] !== seq) return;
      toast.error(errorMessage(e));
      await load(month);
    }
  }

  function reorderUsers(userIds: string[]) {
    setData((prev) => {
      if (!prev) return prev;
      const byId = new Map(prev.users.map((user) => [user.userId, user]));
      const users = userIds
        .map((id) => byId.get(id))
        .filter((user): user is ScheduleMonthData["users"][number] => !!user);
      if (users.length !== prev.users.length) return prev;
      return { ...prev, users };
    });
    void api("PUT", "/attendance/schedule/user-order", { userIds }).catch(
      (e) => {
        toast.error(errorMessage(e));
        void load(month);
      },
    );
  }

  async function saveMonthAllowance() {
    const value = Number(monthAllowanceInput);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("本月假期须为非负数字");
      return;
    }
    setSavingAllowance(true);
    try {
      await api("PUT", "/attendance/schedule/month-config", {
        month,
        monthAllowance: value,
      });
      toast.success("已保存本月假期");
      await load(month);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSavingAllowance(false);
    }
  }

  const [yearLabel, mon] = month.split("-");
  const canGoPrev = month > minMonth;
  const canGoNext = month < maxMonth;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!canGoPrev}
              onClick={() =>
                setMonth(
                  clampScheduleMonth(
                    dayjs(`${month}-01`).subtract(1, "month").format("YYYY-MM"),
                  ),
                )
              }
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <div className="min-w-28 text-center text-sm font-medium">
              {yearLabel}年{Number(mon)}月
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!canGoNext}
              onClick={() =>
                setMonth(
                  clampScheduleMonth(
                    dayjs(`${month}-01`).add(1, "month").format("YYYY-MM"),
                  ),
                )
              }
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>

          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!data}
                onClick={openLeaveSettings}
              >
                <Settings className="size-3.5" />
                设置
              </Button>
              <div className="flex items-center gap-2">
                <Label htmlFor="month-allowance" className="shrink-0 text-sm">
                  本月假期（全员）
                </Label>
                <Input
                  id="month-allowance"
                  type="number"
                  min={0}
                  step={0.5}
                  className="w-28 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  value={monthAllowanceInput}
                  onChange={(e) => setMonthAllowanceInput(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={savingAllowance}
                onClick={() => void saveMonthAllowance()}
              >
                {savingAllowance ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    保存中…
                  </>
                ) : (
                  "保存假期"
                )}
              </Button>
            </div>
          ) : null}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : !data ? (
            <div className={cn("text-sm", attendanceMutedTextClass)}>
              暂无数据
            </div>
          ) : (
            <ScrollArea className="max-w-full whitespace-nowrap [&_[data-slot=table-container]]:w-max">
              <ScheduleUsersTable
                data={data}
                isAdmin={isAdmin}
                holidayDateKey={holidayDateKey}
                holidays={holidays}
                onReorderUsers={reorderUsers}
                renderLeaveOffset={(user) =>
                  isAdmin ? (
                    <LeaveOffsetInput
                      value={user.leaveOffsetDays}
                      onCommit={(days) =>
                        void saveLeaveOffset(user.userId, days)
                      }
                    />
                  ) : (
                    formatDayCount(user.leaveOffsetDays)
                  )
                }
              />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          <div
            className={cn("mt-4 space-y-2 text-sm", attendanceMutedTextClass)}
          >
            {holidays ? (
              <>
                <div className="font-medium text-foreground">
                  {holidays.year}年法定节假日
                </div>
                <ul className="space-y-2">
                  {holidays.periods.map((p) => (
                    <li key={`${p.name}-${p.start}`}>
                      <span className="text-foreground">{p.name}</span>
                      {"："}
                      {formatHolidayRange(p.start, p.end)}
                    </li>
                  ))}
                </ul>
                {holidays.makeupDays.length > 0 ? (
                  <>
                    <div className="font-medium text-foreground">调休上班</div>
                    <ul className="space-y-2">
                      {holidays.makeupDays.map((d) => (
                        <li key={d.date}>
                          {d.date.slice(5).replace("-", "月")}日 {d.name}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {SCHEDULE_SHIFT_LEGEND.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "size-3.5 shrink-0 rounded-sm",
                      SCHEDULE_SHIFT_SWATCH_CLASS[item.key],
                    )}
                    aria-hidden
                  />
                  <span>
                    {item.label}={item.hint}
                  </span>
                </span>
              ))}
            </div>

            <p>休息须在考勤页手动登记；未登记的半天可自行选择休息或补卡。</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>设置</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>初始假期额度</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveDraft.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>{row.userName}</TableCell>
                  <TableCell>
                    <Input
                      inputMode="decimal"
                      value={row.value}
                      className="h-8 w-28"
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next !== "" && !LEAVE_BALANCE_DRAFT.test(next)) {
                          return;
                        }
                        setLeaveDraft((prev) =>
                          prev.map((item) =>
                            item.userId === row.userId
                              ? { ...item, value: next }
                              : item,
                          ),
                        );
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={savingLeave}
              onClick={() => setSettingsOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={savingLeave}
              onClick={() => void saveLeaveSettings()}
            >
              {savingLeave ? (
                <>
                  <Spinner data-icon="inline-start" />
                  保存中…
                </>
              ) : (
                "确定"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
