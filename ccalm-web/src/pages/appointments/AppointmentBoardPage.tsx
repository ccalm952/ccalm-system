import * as React from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/config/routes";
import { api } from "@/lib/api";
import { assignLanes, minutesOf } from "@/lib/appointments/layout";
import {
  APPOINTMENT_TONES,
  ARRIVED_DOT,
  LEGEND_KEYS,
  toneOf,
} from "@/lib/appointments/status";
import type {
  AppointmentCard,
  AppointmentMeta,
  BoardResponse,
  PendingRow,
} from "@/lib/appointments/types";
import { errorMessage } from "@/lib/errorMessage";
import { can } from "@/lib/permissions";
import { useAuth } from "@/lib/use-auth";

import { AppointmentDrawer } from "./appointment-drawer";

const DAY_START = 8 * 60;
const DAY_END = 19 * 60;
const PX_PER_MIN = 0.8;
const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function mondayOf(date: string): string {
  const d = dayjs(date);
  const offset = d.day() === 0 ? 6 : d.day() - 1;
  return d.subtract(offset, "day").format("YYYY-MM-DD");
}

function plusMinutes(time: string, minutes: number): string {
  const total = minutesOf(time) + minutes;
  const h = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m}`;
}
function timeAt(totalMinutes: number): string {
  const total = Math.max(0, totalMinutes);
  const h = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m}`;
}
function pendingToCard(p: PendingRow): AppointmentCard {
  return {
    id: p.id,
    patientId: p.patientId,
    patientName: p.patientName,
    chartNo: p.chartNo,
    gender: "",
    age: null,
    phone: p.phone,
    visitDate: p.visitDate,
    startTime: "",
    endTime: "",
    doctor: p.doctor,
    kind: "return",
    status: "booked",
    arrived: false,
    items: p.items,
    isPending: true,
    pendingReason: p.pendingReason,
    remark: p.remark,
    createdById: null,
  };
}
function statusKey(card: AppointmentCard): string {
  return card.isPending ? "pending" : card.status;
}

type ReasonState = {
  card: AppointmentCard;
  action: "miss" | "cancel";
} | null;

export function AppointmentBoardPage() {
  const { me } = useAuth();
  const [anchor, setAnchor] = React.useState(dayjs().format("YYYY-MM-DD"));
  const [view, setView] = React.useState<"week" | "day">("week");
  const [dayDate, setDayDate] = React.useState(dayjs().format("YYYY-MM-DD"));
  const [board, setBoard] = React.useState<BoardResponse | null>(null);
  const [pending, setPending] = React.useState<PendingRow[]>([]);
  const [meta, setMeta] = React.useState<AppointmentMeta | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [doctorFilter, setDoctorFilter] = React.useState<string>("all");
  const [hidden, setHidden] = React.useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [draftDate, setDraftDate] = React.useState(
    dayjs().format("YYYY-MM-DD"),
  );
  const [draftStart, setDraftStart] = React.useState("09:00");
  const [now, setNow] = React.useState(() => dayjs());
  const [editing, setEditing] = React.useState<AppointmentCard | null>(null);
  const [selected, setSelected] = React.useState<AppointmentCard | null>(null);
  const [reason, setReason] = React.useState<ReasonState>(null);
  const [reasonText, setReasonText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [dragTip, setDragTip] = React.useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [resize, setResize] = React.useState<{
    card: AppointmentCard;
    startY: number;
    origEnd: string;
  } | null>(null);
  const [resizeEnd, setResizeEnd] = React.useState<string | null>(null);
  const lastResizeAt = React.useRef(0);

  const from = mondayOf(anchor);
  const to = dayjs(from).add(6, "day").format("YYYY-MM-DD");
  const rangeFrom = view === "day" && dayDate < from ? dayDate : from;
  const rangeTo = view === "day" && dayDate > to ? dayDate : to;

  const load = React.useCallback(async () => {
    try {
      const [data, pendingRows] = await Promise.all([
        api<BoardResponse>(
          "GET",
          `/appointments/board?from=${rangeFrom}&to=${rangeTo}`,
        ),
        api<PendingRow[]>("GET", "/appointments/pending"),
      ]);
      setBoard(data);
      setPending(pendingRows);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    api<AppointmentMeta>("GET", "/appointments/meta")
      .then(setMeta)
      .catch((e: unknown) => toast.error(errorMessage(e)));
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(dayjs()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const dates = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        dayjs(from).add(i, "day").format("YYYY-MM-DD"),
      ),
    [from],
  );

  const columns = React.useMemo(() => {
    if (view === "week") {
      return dates.map((date, i) => ({
        key: date,
        label: `${WEEKDAYS[i]} ${dayjs(date).format("MM/DD")}`,
        date,
        doctor: "",
      }));
    }
    return (meta?.doctors ?? []).map((name) => ({
      key: `doc-${name}`,
      label: name,
      date: dayDate,
      doctor: name,
    }));
  }, [view, dates, meta, dayDate]);
  const appointments = React.useMemo(() => board?.appointments ?? [], [board]);
  const visible = React.useMemo(
    () =>
      appointments.filter(
        (a) =>
          !hidden.has(statusKey(a)) &&
          (doctorFilter === "all" || a.doctor === doctorFilter),
      ),
    [appointments, hidden, doctorFilter],
  );

  const counts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const key of LEGEND_KEYS) map[key] = 0;
    for (const a of appointments) {
      const key = statusKey(a);
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [appointments]);

  const byColumn = React.useMemo(() => {
    const map = new Map<string, AppointmentCard[]>();
    for (const col of columns) map.set(col.key, []);
    for (const a of visible) {
      if (a.isPending || !a.startTime) continue;
      const start = minutesOf(a.startTime);
      if (start < DAY_START || start >= DAY_END) continue;
      const end = a.endTime || plusMinutes(a.startTime, 30);
      const col =
        view === "week"
          ? columns.find((c) => c.date === a.visitDate)
          : columns.find(
              (c) => c.doctor === a.doctor && a.visitDate === dayDate,
            );
      if (!col) continue;
      const list = map.get(col.key) ?? [];
      list.push({ ...a, endTime: end });
      map.set(col.key, list);
    }
    return map;
  }, [visible, columns, view, dayDate]);
  function toggleLegend(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function act(card: AppointmentCard, path: string, body?: unknown) {
    setBusy(true);
    try {
      await api("POST", `/appointments/${card.id}/${path}`, body);
      toast.success("已更新");
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(card: AppointmentCard) {
    setBusy(true);
    try {
      await api("DELETE", `/appointments/${card.id}`);
      toast.success("已删除");
      setSelected(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function submitReason() {
    if (!reason) return;
    if (reasonText.trim().length < 2) {
      toast.error("请填写原因（至少 2 个字）");
      return;
    }
    await act(reason.card, reason.action, { reason: reasonText.trim() });
    setReason(null);
    setReasonText("");
  }

  function updateDragTip(e: React.DragEvent) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const col = el?.closest<HTMLElement>("[data-col-date]");
    if (!col) {
      setDragTip(null);
      return;
    }
    const date = col.dataset.colDate ?? "";
    const rect = col.getBoundingClientRect();
    const raw = DAY_START + (e.clientY - rect.top) / PX_PER_MIN;
    const snapped = Math.min(
      DAY_END - 15,
      Math.max(DAY_START, Math.round(raw / 15) * 15),
    );
    setDragTip({
      x: e.clientX + 14,
      y: e.clientY + 14,
      text: `${dayjs(date).format("MM/DD")} ${timeAt(snapped)}`,
    });
  }

  React.useEffect(() => {
    if (!resize) return;
    const move = (ev: MouseEvent) => {
      const delta =
        Math.round((ev.clientY - resize.startY) / PX_PER_MIN / 15) * 15;
      const startMin = minutesOf(resize.card.startTime);
      const endMin = Math.min(
        DAY_END,
        Math.max(startMin + 15, minutesOf(resize.origEnd) + delta),
      );
      setResizeEnd(timeAt(endMin));
    };
    const up = () => {
      const end = resizeEnd;
      lastResizeAt.current = Date.now();
      setResize(null);
      setResizeEnd(null);
      if (end) {
        setEditing({ ...resize.card, endTime: end });
        setDrawerOpen(true);
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [resize, resizeEnd]);
  function startDrag(
    e: React.DragEvent,
    payload: { type: "card" | "pending"; id: number },
  ) {
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "move";
  }

  async function dropOnColumn(
    e: React.DragEvent,
    col: { date: string; doctor: string },
  ) {
    const date = col.date;
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    let payload: { type: "card" | "pending"; id: number };
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const rawMinutes = DAY_START + (e.clientY - rect.top) / PX_PER_MIN;
    const snapped = Math.min(
      DAY_END - 15,
      Math.max(DAY_START, Math.round(rawMinutes / 15) * 15),
    );
    const startTime = timeAt(snapped);

    if (payload.type === "card") {
      const card = appointments.find((a) => a.id === payload.id);
      if (!card) return;
      const duration = Math.max(
        15,
        minutesOf(card.endTime || timeAt(minutesOf(card.startTime) + 30)) -
          minutesOf(card.startTime),
      );
      setEditing({
        ...card,
        visitDate: date,
        startTime,
        endTime: timeAt(snapped + duration),
        doctor: col.doctor || card.doctor,
      });
      setDrawerOpen(true);
      return;
    }

    const p = pending.find((x) => x.id === payload.id);
    if (!p) return;
    setDraftDate(date);
    setDraftStart(startTime);
    setEditing({
      ...pendingToCard(p),
      visitDate: date,
      startTime,
      endTime: timeAt(snapped + 30),
      doctor: col.doctor,
    });
    setDrawerOpen(true);
  }
  const unscheduled = React.useMemo(
    () => visible.filter((a) => !a.isPending && !a.startTime),
    [visible],
  );
  const gridHeight = (DAY_END - DAY_START) * PX_PER_MIN;
  const nowMinutes = minutesOf(now.format("HH:mm"));
  const nowTop = (nowMinutes - DAY_START) * PX_PER_MIN;
  const today = dayjs().format("YYYY-MM-DD");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      {/* 工具条 */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() =>
            view === "week"
              ? setAnchor(dayjs(anchor).subtract(7, "day").format("YYYY-MM-DD"))
              : setDayDate(
                  dayjs(dayDate).subtract(1, "day").format("YYYY-MM-DD"),
                )
          }
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() =>
            view === "week"
              ? setAnchor(dayjs(anchor).add(7, "day").format("YYYY-MM-DD"))
              : setDayDate(dayjs(dayDate).add(1, "day").format("YYYY-MM-DD"))
          }
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAnchor(dayjs().format("YYYY-MM-DD"));
            setDayDate(dayjs().format("YYYY-MM-DD"));
          }}
        >
          今天
        </Button>
        <div className="flex overflow-hidden rounded-md border text-xs">
          <button
            type="button"
            onClick={() => setView("week")}
            className={`px-2.5 py-1.5 ${
              view === "week" ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            周
          </button>
          <button
            type="button"
            onClick={() => setView("day")}
            className={`px-2.5 py-1.5 ${
              view === "day" ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            日
          </button>
        </div>
        <span className="text-sm font-medium">
          {view === "week"
            ? `${dayjs(from).format("M月D日")} - ${dayjs(to).format("M月D日")}`
            : `${dayjs(dayDate).format("YYYY年M月D日")} ${
                WEEKDAYS[(dayjs(dayDate).day() + 6) % 7]
              }`}
        </span>

        <Select
          items={[
            { value: "all", label: "全部医生" },
            ...(meta?.doctors ?? []).map((n) => ({ value: n, label: n })),
          ]}
          value={doctorFilter}
          onValueChange={(v) => {
            if (v) setDoctorFilter(v);
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部医生</SelectItem>
            {(meta?.doctors ?? []).map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap items-center gap-1.5">
          {LEGEND_KEYS.map((key) => {
            const tone = APPOINTMENT_TONES[key];
            const off = hidden.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleLegend(key)}
                className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-opacity ${
                  off ? "opacity-35" : ""
                }`}
                style={{
                  backgroundColor: tone.bg,
                  borderColor: tone.bar,
                  color: "#1d222a",
                }}
                title={off ? "点击显示" : "点击隐藏"}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: tone.bar }}
                />
                {tone.label}
                <span className="tabular-nums opacity-70">
                  {counts[key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            render={<Link to={ROUTES.appointments.list} />}
          >
            列表
          </Button>
          {can(me, "appointment.create") ? (
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraftDate(view === "day" ? dayDate : anchor);
                setDraftStart("09:00");
                setDrawerOpen(true);
              }}
            >
              <Plus className="size-4" />
              新建预约
            </Button>
          ) : null}
        </div>
      </div>

      {unscheduled.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            未排时间 {unscheduled.length}
          </span>
          {unscheduled.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setEditing(a);
                setDrawerOpen(true);
              }}
              className="rounded-md border bg-card px-2 py-0.5 text-xs hover:bg-accent"
            >
              {a.visitDate.slice(5)} {a.patientName}
            </button>
          ))}
        </div>
      ) : null}
      {/* 待定池 + 网格 */}
      <div className="flex min-h-0 flex-1 gap-3">
        <aside className="hidden w-52 shrink-0 flex-col rounded-xl border bg-card md:flex">
          <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium">
            <span>待定预约</span>
            <Badge variant="secondary">{pending.length}</Badge>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2">
            {pending.map((p) => (
              <button
                key={p.id}
                type="button"
                draggable
                onDragStart={(e) => startDrag(e, { type: "pending", id: p.id })}
                onClick={() => {
                  setEditing(pendingToCard(p));
                  setDrawerOpen(true);
                }}
                className="cursor-grab rounded-lg border border-pink-200 bg-pink-50/50 px-2 py-1.5 text-left text-xs hover:bg-pink-50 active:cursor-grabbing"
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="font-medium">{p.patientName}</span>
                  {p.expired ? (
                    <span className="rounded bg-red-100 px-1 text-[10px] text-red-600">
                      已过期
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-muted-foreground">
                  {p.visitDate}
                  {p.items.length ? ` · ${p.items.join("/")}` : ""}
                </span>
              </button>
            ))}
            {!pending.length ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                暂无待定
              </p>
            ) : null}
          </div>
        </aside>
        <div className="flex min-h-0 flex-1 overflow-auto rounded-xl border bg-card">
          {loading ? (
            <div className="flex h-64 w-full items-center justify-center">
              <Spinner className="size-8 opacity-60" />
            </div>
          ) : (
            <div className="flex min-w-[900px] flex-1 flex-col">
              <div className="sticky top-0 z-10 flex border-b bg-card">
                <div className="w-14 shrink-0" />
                {columns.map((col) => {
                  const isToday = col.date === today;
                  const count =
                    view === "week"
                      ? (board?.days.find((d) => d.date === col.date)?.counts
                          .booked ?? 0)
                      : (byColumn.get(col.key) ?? []).length;
                  return (
                    <div
                      key={col.key}
                      className={`flex flex-1 flex-col items-center border-l py-1.5 text-xs ${
                        isToday ? "bg-primary/5 font-medium text-primary" : ""
                      }`}
                    >
                      <span>{col.label}</span>
                      <span className="text-[10px] opacity-70">
                        {count} 预约
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex">
                <div className="w-14 shrink-0">
                  <div className="relative" style={{ height: gridHeight }}>
                    {Array.from({ length: 12 }, (_, i) => 8 + i).map((h) => (
                      <div
                        key={h}
                        className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums"
                        style={{
                          top:
                            (h * 60 - DAY_START) * PX_PER_MIN +
                            (h === 8 ? 8 : 0),
                        }}
                      >
                        {String(h).padStart(2, "0")}:00
                      </div>
                    ))}
                  </div>
                </div>

                {columns.map((col) => {
                  const dayCards = byColumn.get(col.key) ?? [];
                  const laidOut = assignLanes(dayCards);
                  return (
                    <div
                      key={col.key}
                      className={`relative flex-1 border-l ${
                        col.date === today ? "bg-primary/[0.03]" : ""
                      }`}
                      style={{ height: gridHeight }}
                      data-col-date={col.date}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => void dropOnColumn(e, col)}
                      onDoubleClick={(e) => {
                        if (!can(me, "appointment.create")) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const raw =
                          DAY_START + (e.clientY - rect.top) / PX_PER_MIN;
                        const snapped = Math.min(
                          DAY_END - 15,
                          Math.max(DAY_START, Math.round(raw / 15) * 15),
                        );
                        setDraftDate(col.date);
                        setDraftStart(timeAt(snapped));
                        setEditing(null);
                        setDrawerOpen(true);
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => 8 + i).map((h) => (
                        <div
                          key={h}
                          className="absolute inset-x-0 border-t border-dashed border-border/70"
                          style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }}
                        />
                      ))}

                      {col.date === today &&
                      nowMinutes > DAY_START &&
                      nowMinutes < DAY_END ? (
                        <div
                          className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive/60"
                          style={{ top: nowTop }}
                        />
                      ) : null}

                      {laidOut.map((card) => {
                        const tone = toneOf(card);
                        const top =
                          (minutesOf(card.startTime) - DAY_START) * PX_PER_MIN;
                        const previewEnd =
                          resize?.card.id === card.id && resizeEnd
                            ? resizeEnd
                            : card.endTime;
                        const height = Math.max(
                          26,
                          (minutesOf(previewEnd) - minutesOf(card.startTime)) *
                            PX_PER_MIN -
                            2,
                        );
                        const width = 100 / card.lanes;
                        return (
                          <button
                            key={card.id}
                            type="button"
                            draggable
                            onDragStart={(e) =>
                              startDrag(e, { type: "card", id: card.id })
                            }
                            onDrag={(e) => updateDragTip(e)}
                            onDragEnd={() => setDragTip(null)}
                            onClick={() => {
                              if (Date.now() - lastResizeAt.current < 400) {
                                return;
                              }
                              setSelected(card);
                            }}
                            className="absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm transition-shadow hover:shadow-md"
                            style={{
                              top,
                              height,
                              left: `calc(${card.lane * width}% + 2px)`,
                              width: `calc(${width}% - 4px)`,
                              backgroundColor: tone.bg,
                              borderLeftColor: tone.bar,
                            }}
                          >
                            <span className="flex items-center gap-1">
                              <span className="truncate font-semibold">
                                {card.patientName}
                              </span>
                              {card.doctor ? (
                                <span className="truncate opacity-70">
                                  [{card.doctor}]
                                </span>
                              ) : null}
                              {card.arrived ? (
                                <span
                                  className="ml-auto size-1.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: ARRIVED_DOT }}
                                  title="已到店"
                                />
                              ) : null}
                            </span>
                            {height >= 36 && card.items.length ? (
                              <span className="block truncate opacity-80">
                                {card.items.join("/")}
                              </span>
                            ) : null}
                            {height >= 48 ? (
                              <span className="block truncate tabular-nums opacity-70">
                                {card.startTime} - {previewEnd}
                              </span>
                            ) : null}
                            <span
                              className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                lastResizeAt.current = Date.now();
                                const end =
                                  card.endTime ||
                                  plusMinutes(card.startTime, 30);
                                setResize({
                                  card,
                                  startY: e.clientY,
                                  origEnd: end,
                                });
                                setResizeEnd(end);
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 明细 */}
      <Dialog
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.patientName}
                  <Badge variant="secondary">{toneOf(selected).label}</Badge>
                  {selected.arrived ? (
                    <Badge variant="secondary">已到店</Badge>
                  ) : null}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-1.5 text-sm">
                <p className="text-muted-foreground">
                  {selected.chartNo}
                  {selected.age ? ` · ${selected.age}岁` : ""}
                  {selected.gender ? ` · ${selected.gender}` : ""}
                  {selected.phone ? ` · ${selected.phone}` : ""}
                </p>
                <Separator />
                <p>
                  <span className="text-muted-foreground">预约时间：</span>
                  {selected.visitDate}
                  {selected.startTime
                    ? ` ${selected.startTime} - ${selected.endTime}`
                    : "（待定）"}
                </p>
                <p>
                  <span className="text-muted-foreground">医生：</span>
                  {selected.doctor || "未指定"}
                </p>
                <p>
                  <span className="text-muted-foreground">项目：</span>
                  {selected.items.length ? selected.items.join("、") : "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">备注：</span>
                  {selected.remark || "—"}
                </p>
              </div>
              <DialogFooter className="flex-wrap justify-end gap-2">
                {selected.status === "booked" && !selected.arrived ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void act(selected, "arrive")}
                  >
                    到店
                  </Button>
                ) : null}
                {selected.status === "booked" ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditing(selected);
                        setSelected(null);
                        setDrawerOpen(true);
                      }}
                    >
                      改约
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setReason({ card: selected, action: "miss" });
                        setReasonText("");
                      }}
                    >
                      失约
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setReason({ card: selected, action: "cancel" });
                        setReasonText("");
                      }}
                    >
                      取消
                    </Button>
                  </>
                ) : null}
                {selected.status === "missed" ||
                selected.status === "cancelled" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void act(selected, "revert")}
                  >
                    撤销
                  </Button>
                ) : null}
                {can(me, "appointment.delete") &&
                selected.status !== "completed" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void remove(selected)}
                  >
                    删除
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 失约/取消原因 */}
      <Dialog
        open={reason != null}
        onOpenChange={(open) => {
          if (!open) setReason(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reason?.action === "miss" ? "登记失约" : "取消预约"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={reasonText}
            onChange={(e) => setReasonText(e.target.value)}
            placeholder="请填写原因（至少 2 个字）"
            rows={3}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReason(null)}
            >
              返回
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void submitReason()}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dragTip ? (
        <div
          className="pointer-events-none fixed z-50 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-lg"
          style={{ left: dragTip.x, top: dragTip.y }}
        >
          {dragTip.text}
        </div>
      ) : null}
      <AppointmentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        meta={meta}
        initial={editing}
        defaultDate={draftDate}
        defaultStart={draftStart}
        onSaved={load}
      />
    </div>
  );
}
