import * as React from "react";
import dayjs from "dayjs";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  SCHEDULE_SHIFT_LABEL,
  clampScheduleMonth,
  scheduleCellClass,
  scheduleMonthRange,
} from "@/lib/attendance/schedule";
import {
  attendanceMutedTextClass,
  scheduleHolidayHeaderClass,
  SCHEDULE_SHIFT_LEGEND,
  SCHEDULE_SHIFT_SWATCH_CLASS,
} from "@/lib/attendance/attendance-theme";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { errorMessage } from "@/lib/errorMessage";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";

export function SchedulePage() {
  const { me } = useAuth();
  const { minMonth, maxMonth } = React.useMemo(() => scheduleMonthRange(), []);
  const [month, setMonth] = React.useState(() => clampScheduleMonth(dayjs().format("YYYY-MM")));
  const [data, setData] = React.useState<ScheduleMonthData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const loadSeqRef = React.useRef(0);
  const hasDataRef = React.useRef(false);
  const [monthAllowanceInput, setMonthAllowanceInput] = React.useState("0");
  const [savingAllowance, setSavingAllowance] = React.useState(false);
  const [holidaysByYear, setHolidaysByYear] = React.useState<Record<string, ChinaHolidayYear>>({});

  const isAdmin = me?.role === "admin";
  const year = month.split("-")[0] ?? dayjs().format("YYYY");
  const holidays = holidaysByYear[year] ?? null;

  const load = React.useCallback(async (targetMonth: string) => {
    const seq = ++loadSeqRef.current;
    if (!hasDataRef.current) {
      setLoading(true);
    }

    try {
      const res = await api<ScheduleMonthData>("GET", `/attendance/schedule?month=${targetMonth}`);
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
                  clampScheduleMonth(dayjs(`${month}-01`).subtract(1, "month").format("YYYY-MM")),
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
                setMonth(clampScheduleMonth(dayjs(`${month}-01`).add(1, "month").format("YYYY-MM")))
              }
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>

          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
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
                保存假期
              </Button>
            </div>
          ) : null}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className={cn("text-sm", attendanceMutedTextClass)}>加载中…</div>
          ) : !data ? (
            <div className={cn("text-sm", attendanceMutedTextClass)}>暂无数据</div>
          ) : (
            <ScrollArea className="max-w-full whitespace-nowrap [&_[data-slot=table-container]]:w-max">
              <Table className="w-max text-center text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 w-24 bg-background text-center">
                      姓名
                    </TableHead>
                    {data.dayHeaders.map((h) => {
                      const dateKey = holidayDateKey(h.day);
                      const holidayName = holidays?.offDayMap[dateKey];
                      const isHoliday = !!holidayName;
                      return (
                        <TableHead
                          key={h.day}
                          title={holidayName}
                          className={cn("w-9 px-1 text-center", isHoliday && scheduleHolidayHeaderClass)}
                        >
                          <div>{h.weekday}</div>
                          <div>{h.day}</div>
                        </TableHead>
                      );
                    })}
                    <TableHead className="w-10 text-center">全</TableHead>
                    <TableHead className="w-10 text-center">上</TableHead>
                    <TableHead className="w-10 text-center">下</TableHead>
                    <TableHead className="w-16 text-center">本月请假</TableHead>
                    <TableHead className="w-16 text-center">本月假期</TableHead>
                    <TableHead className="w-16 text-center">剩余假期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map((user) => (
                    <TableRow key={user.userId}>
                      <TableCell className="sticky left-0 z-10 w-24 bg-background text-center font-medium">
                        {user.userName}
                      </TableCell>
                      {data.dayHeaders.map((h) => {
                        const shift = user.days[String(h.day)] ?? null;
                        return (
                          <TableCell key={h.day} className="w-9 p-0.5 text-center">
                            <span
                              className={cn(
                                "mx-auto flex h-8 w-8 items-center justify-center rounded text-sm",
                                scheduleCellClass(shift),
                              )}
                            >
                              {shift ? SCHEDULE_SHIFT_LABEL[shift] : ""}
                            </span>
                          </TableCell>
                        );
                      })}
                      <TableCell className="w-10 text-center">{user.fullCount}</TableCell>
                      <TableCell className="w-10 text-center">{user.morningCount}</TableCell>
                      <TableCell className="w-10 text-center">{user.afternoonCount}</TableCell>
                      <TableCell className="w-16 text-center">
                        {formatDayCount(user.monthLeave)}
                      </TableCell>
                      <TableCell className="w-16 text-center">
                        {formatDayCount(data.monthAllowance)}
                      </TableCell>
                      <TableCell className="w-16 text-center">
                        {formatDayCount(user.remainingLeave)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {holidays ? (
            <div className="mt-4 space-y-2 text-sm">
              <div className="font-medium">{holidays.year}年法定节假日</div>
              <ul className={cn("space-y-1", attendanceMutedTextClass)}>
                {holidays.periods.map((p) => (
                  <li key={`${p.name}-${p.start}`}>
                    <span className="text-foreground">{p.name}</span>
                    {"："}
                    {formatHolidayRange(p.start, p.end)}
                  </li>
                ))}
              </ul>
              {holidays.makeupDays.length > 0 ? (
                <div className="space-y-1">
                  <div className="font-medium">调休上班</div>
                  <ul className={cn("space-y-1", attendanceMutedTextClass)}>
                    {holidays.makeupDays.map((d) => (
                      <li key={d.date}>
                        {d.date.slice(5).replace("-", "月")}日 {d.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={cn("mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs", attendanceMutedTextClass)}>
            {SCHEDULE_SHIFT_LEGEND.map((item) => (
              <span key={item.key} className="inline-flex items-center gap-1.5">
                <span
                  className={cn("size-3.5 shrink-0 rounded-sm", SCHEDULE_SHIFT_SWATCH_CLASS[item.key])}
                  aria-hidden
                />
                <span>
                  {item.label}={item.hint}
                </span>
              </span>
            ))}
          </div>

          <p className={cn("mt-2 text-xs", attendanceMutedTextClass)}>
            排班由打卡记录自动推算；员工在考勤页登记的休息优先显示。无打卡记录不推断全休。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
