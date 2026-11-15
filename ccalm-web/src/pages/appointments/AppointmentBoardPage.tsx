import * as React from "react";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent } from "@/components/ui/popover";
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
const DAY_END = 22 * 60;
const SLOT_PX = 28;
const PX_PER_MIN = SLOT_PX / 15;
const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const HOURS = Array.from(
  { length: (DAY_END - DAY_START) / 60 },
  (_, i) => DAY_START / 60 + i,
);

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

type ConfirmMove = {
  card: AppointmentCard;
  visitDate: string;
  startTime: string;
  endTime: string;
  doctor: string;
};

type DragState = {
  kind: "card" | "pending" | "new";
  card?: AppointmentCard;
  pending?: PendingRow;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
  duration: number;
  date: string;
  start: string;
  end: string;
  doctor: string;
};

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
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [popoverAnchor, setPopoverAnchor] = React.useState<HTMLElement | null>(
    null,
  );
  const [reason, setReason] = React.useState<ReasonState>(null);
  const [reasonOpen, setReasonOpen] = React.useState(false);
  const [reasonText, setReasonText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [draftDuration, setDraftDuration] = React.useState<number | undefined>(
    undefined,
  );
  const [draftResize, setDraftResize] = React.useState<{
    startY: number;
    origDuration: number;
  } | null>(null);
  const [confirmMove, setConfirmMove] = React.useState<ConfirmMove | null>(
    null,
  );
  const [confirmMoveOpen, setConfirmMoveOpen] = React.useState(false);
  const [pendingBookOpen, setPendingBookOpen] = React.useState(false);
  const [pendingBook, setPendingBook] = React.useState<{
    row: PendingRow;
    visitDate: string;
    startTime: string;
    doctor: string;
  } | null>(null);
  const [pendingMove, setPendingMove] = React.useState<{
    id: number;
    visitDate: string;
    startTime: string;
    endTime: string;
    doctor: string;
  } | null>(null);
  const [timeSync, setTimeSync] = React.useState<{
    visitDate: string;
    startTime: string;
    endTime: string;
    nonce: number;
  } | null>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const lastDragAt = React.useRef(0);
  const drawerOpenRef = React.useRef(false);
  const editingRef = React.useRef<AppointmentCard | null>(null);
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
    for (const source of visible) {
      const dragging =
        drag &&
        drag.kind === "card" &&
        drag.moved &&
        drag.card?.id === source.id
          ? {
              visitDate: drag.date,
              startTime: drag.start,
              endTime: drag.end,
              doctor: drag.doctor || source.doctor,
            }
          : null;
      const a = dragging
        ? { ...source, ...dragging }
        : pendingMove && pendingMove.id === source.id
          ? { ...source, ...pendingMove }
          : source;
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
  }, [visible, columns, view, dayDate, pendingMove, drag]);
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
      setPopoverOpen(false);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirmMoveNow() {
    if (!confirmMove) return;
    setBusy(true);
    try {
      await api("PUT", `/appointments/${confirmMove.card.id}`, {
        visitDate: confirmMove.visitDate,
        startTime: confirmMove.startTime,
        endTime: confirmMove.endTime,
        doctor: confirmMove.doctor,
      });
      toast.success("预约时间已修改");
      setConfirmMoveOpen(false);
      setPendingMove(null);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function confirmPendingBook() {
    if (!pendingBook) return;
    if (!pendingBook.doctor) {
      toast.error("该待定预约缺少医生，请先点卡片补充医生");
      return;
    }
    setBusy(true);
    try {
      await api("PUT", `/appointments/${pendingBook.row.id}`, {
        visitDate: pendingBook.visitDate,
        startTime: pendingBook.startTime,
        durationMinutes: 30,
        doctor: pendingBook.doctor,
        isPending: false,
      });
      toast.success("已确认预约");
      setPendingBookOpen(false);
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
      setPopoverOpen(false);
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
    setReasonOpen(false);
    setReasonText("");
  }

  React.useEffect(() => {
    if (!resize) return;
    const move = (ev: MouseEvent) => {
      const delta =
        Math.round((ev.clientY - resize.startY) / PX_PER_MIN / 15) * 15;
      const startMin = minutesOf(resize.card.startTime);
      const endMin = Math.min(
        DAY_END,
        startMin + 90,
        Math.max(startMin + 15, minutesOf(resize.origEnd) + delta),
      );
      setResizeEnd(timeAt(endMin));
    };
    const up = () => {
      const end = resizeEnd;
      lastResizeAt.current = Date.now();
      setResize(null);
      setResizeEnd(null);
      if (end && end !== resize.card.endTime) {
        setPendingMove({
          id: resize.card.id,
          visitDate: resize.card.visitDate,
          startTime: resize.card.startTime,
          endTime: end,
          doctor: resize.card.doctor,
        });
        if (drawerOpenRef.current) setDrawerOpen(false);
        setConfirmMoveOpen(true);
        setConfirmMove({
          card: resize.card,
          visitDate: resize.card.visitDate,
          startTime: resize.card.startTime,
          endTime: end,
          doctor: resize.card.doctor,
        });
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [resize, resizeEnd]);

  React.useEffect(() => {
    if (!draftResize) return;
    const move = (ev: MouseEvent) => {
      const delta =
        Math.round((ev.clientY - draftResize.startY) / PX_PER_MIN / 15) * 15;
      setDraftDuration(
        Math.min(90, Math.max(15, draftResize.origDuration + delta)),
      );
    };
    const up = () => setDraftResize(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [draftResize]);
  function targetAt(x: number, y: number, d: DragState) {
    const el = document.elementFromPoint(x, y);
    const col = el?.closest<HTMLElement>("[data-col-date]");
    if (!col) return null;
    const rect = col.getBoundingClientRect();
    const raw = DAY_START + (y - rect.top) / PX_PER_MIN;
    const snapped = Math.min(
      DAY_END - 15,
      Math.max(DAY_START, Math.round(raw / 15) * 15),
    );
    return {
      date: col.dataset.colDate ?? d.date,
      start: timeAt(snapped),
      end: timeAt(snapped + d.duration),
      doctor: col.dataset.colDoctor ?? "",
    };
  }

  function beginCardDrag(e: React.PointerEvent, card: AppointmentCard) {
    if (e.button !== 0) return;
    if (!canOperate(card.id)) return;
    if (card.status !== "booked") {
      toast.message("仅「预约」状态的预约可以拖动调整时间");
      return;
    }
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDrag({
      kind: "card",
      card,
      width: rect.width,
      height: rect.height,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      duration: Math.max(
        15,
        minutesOf(card.endTime || plusMinutes(card.startTime, 30)) -
          minutesOf(card.startTime),
      ),
      date: card.visitDate,
      start: card.startTime,
      end: card.endTime,
      doctor: card.doctor,
    });
  }

  function beginPendingDrag(e: React.PointerEvent, p: PendingRow) {
    if (e.button !== 0) return;
    if (drawerOpen) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDrag({
      kind: "pending",
      pending: p,
      width: rect.width,
      height: rect.height,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      duration: 30,
      date: p.visitDate,
      start: "",
      end: "",
      doctor: p.doctor,
    });
  }

  function beginNewDrag(
    e: React.PointerEvent,
    col: { date: string; doctor: string },
  ) {
    if (e.button !== 0) return;
    if (drawerOpen) return;
    if (e.target !== e.currentTarget) return;
    setDrag({
      kind: "new",
      width: 150,
      height: 46,
      offsetX: 24,
      offsetY: 22,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      duration: 15,
      date: col.date,
      start: "09:00",
      end: "09:15",
      doctor: col.doctor,
    });
  }

  function beginFloatDrag(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const start = draftStart || "09:00";
    const dur = draftDuration ?? meta?.defaultDuration ?? 30;
    setDrag({
      kind: "new",
      width: rect.width,
      height: rect.height,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      duration: dur,
      date: draftDate,
      start,
      end: timeAt(minutesOf(start) + dur),
      doctor: "",
    });
  }
  dragRef.current = drag;
  drawerOpenRef.current = drawerOpen;
  editingRef.current = editing;
  const dragActive = drag != null;
  const createMode = drawerOpen && !editing;
  const editModeId = drawerOpen && editing ? editing.id : null;
  const canOperate = (id: number) => {
    if (!drawerOpen) return true;
    if (createMode) return false;
    return editModeId === id;
  };

  React.useEffect(() => {
    if (!dragActive) return;
    const onMove = (ev: PointerEvent) => {
      setDrag((prev) => {
        if (!prev) return prev;
        const moved =
          prev.moved ||
          Math.hypot(ev.clientX - prev.startX, ev.clientY - prev.startY) > 4;
        const target = targetAt(ev.clientX, ev.clientY, prev);
        return {
          ...prev,
          x: ev.clientX,
          y: ev.clientY,
          moved,
          ...(target ?? {}),
        };
      });
    };
    const onUp = () => {
      const d = dragRef.current;
      setDrag(null);
      if (!d) return;
      if (!d.moved) {
        if (d.kind === "card" && d.card) setSelected(d.card);
        return;
      }
      lastDragAt.current = Date.now();
      if (d.kind === "card" && d.card) {
        setPendingMove({
          id: d.card.id,
          visitDate: d.date,
          startTime: d.start,
          endTime: d.end,
          doctor: d.doctor || d.card.doctor,
        });
        const unchanged =
          d.date === d.card.visitDate &&
          d.start === d.card.startTime &&
          d.end === (d.card.endTime || plusMinutes(d.card.startTime, 30));
        if (unchanged) {
          setPendingMove(null);
          return;
        }
        if (drawerOpenRef.current) setDrawerOpen(false);
        setConfirmMoveOpen(true);
        setConfirmMove({
          card: d.card,
          visitDate: d.date,
          startTime: d.start,
          endTime: d.end,
          doctor: d.doctor || d.card.doctor,
        });
      } else if (d.kind === "pending" && d.pending) {
        setPendingBookOpen(true);
        setPendingBook({
          row: d.pending,
          visitDate: d.date,
          startTime: d.start || "09:00",
          doctor: d.doctor || d.pending.doctor,
        });
      } else if (drawerOpenRef.current && !editingRef.current) {
        setDraftDate(d.date);
        setDraftStart(d.start);
        setTimeSync({
          visitDate: d.date,
          startTime: d.start,
          endTime: d.end,
          nonce: Date.now(),
        });
      } else {
        setDraftDate(d.date);
        setDraftStart(d.start);
        setDraftDuration(15);
        setEditing(null);
        setDrawerOpen(true);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragActive]);
  const unscheduled = React.useMemo(
    () => visible.filter((a) => !a.isPending && !a.startTime),
    [visible],
  );
  const gridHeight = (DAY_END - DAY_START) * PX_PER_MIN;
  const nowMinutes = minutesOf(now.format("HH:mm"));
  const nowTop = (nowMinutes - DAY_START) * PX_PER_MIN;
  const today = dayjs().format("YYYY-MM-DD");

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 p-4 transition-[padding]"
      style={{
        paddingRight: drawerOpen ? "calc(min(96vw, 440px) + 12px)" : undefined,
      }}
    >
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
        <Tabs
          value={view}
          onValueChange={(v) => {
            if (v === "week" || v === "day") setView(v);
          }}
          className="flex-none"
        >
          <TabsList className="h-8 gap-2 rounded-none bg-transparent p-0">
            <TabsTrigger
              value="week"
              className="h-8 rounded-2xl border-border! bg-background px-3 py-0 text-sm font-medium text-foreground/60 hover:bg-muted data-active:bg-muted data-active:text-foreground"
            >
              周
            </TabsTrigger>
            <TabsTrigger
              value="day"
              className="h-8 rounded-2xl border-border! bg-background px-3 py-0 text-sm font-medium text-foreground/60 hover:bg-muted data-active:bg-muted data-active:text-foreground"
            >
              日
            </TabsTrigger>
          </TabsList>
        </Tabs>{" "}
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
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-opacity ${
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
            nativeButton={false}
            render={<Link to={ROUTES.appointments.list} />}
          >
            列表
          </Button>
          {can(me, "appointment.create") ? (
            <Button
              type="button"
              onClick={() => {
                if (drawerOpen) return;
                setEditing(null);
                setDraftDate(view === "day" ? dayDate : from);
                setDraftStart("08:00");
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
          <span className="text-sm font-medium text-muted-foreground">
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
              className="rounded-md border bg-card px-2 py-0.5 text-sm hover:bg-accent"
            >
              {a.visitDate.slice(5)} {a.patientName}
            </button>
          ))}
        </div>
      ) : null}
      {/* 待定池 + 网格 */}
      <div className="flex min-h-0 flex-1 gap-3">
        <aside className="hidden w-52 shrink-0 flex-col md:flex">
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pb-2">
            {pending.map((p) => (
              <button
                key={p.id}
                type="button"
                onPointerDown={(e) => beginPendingDrag(e, p)}
                onClick={() => {
                  if (drawerOpen) return;
                  if (Date.now() - lastDragAt.current < 300) return;
                  setEditing(pendingToCard(p));
                  setDrawerOpen(true);
                }}
                className={`cursor-grab touch-none rounded-lg border border-pink-200 bg-pink-50/50 px-2 py-1.5 text-left text-sm select-none hover:bg-pink-50 active:cursor-grabbing ${
                  drag?.kind === "pending" && drag.pending?.id === p.id
                    ? "opacity-40"
                    : ""
                }`}
              >
                <span className="flex items-center justify-between gap-1">
                  <span className="font-medium">{p.patientName}</span>
                  {p.expired ? (
                    <span className="rounded bg-red-100 px-1 text-sm text-red-600">
                      已过期
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-muted-foreground">
                  {p.visitDate}
                  {p.doctor ? ` · ${p.doctor}` : ""}
                  {p.items.length ? ` · ${p.items.join("/")}` : ""}
                </span>
              </button>
            ))}
            {!pending.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                暂无待定
              </p>
            ) : null}
          </div>
        </aside>
        <div className="flex min-h-0 flex-1 overflow-auto bg-card">
          {loading ? (
            <div className="flex h-64 w-full items-center justify-center">
              <Spinner className="size-8 opacity-60" />
            </div>
          ) : (
            <div className="relative flex min-w-[900px] flex-1 flex-col">
              <div className="sticky top-0 z-10 flex border-b border-border bg-card/95 backdrop-blur">
                <div className="w-16 shrink-0" />
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
                      className={`flex flex-1 flex-col items-center border-l border-border/50 py-2 text-sm ${
                        isToday ? "bg-primary/10 font-medium text-primary" : ""
                      }`}
                    >
                      <span>{col.label}</span>
                      <span className="text-sm opacity-70">{count} 预约</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex">
                <div className="w-16 shrink-0">
                  <div className="relative" style={{ height: gridHeight }}>
                    {Array.from(
                      { length: (DAY_END - DAY_START) / 15 },
                      (_, i) => i,
                    ).map((i) => (
                      <div
                        key={`slot-${i}`}
                        className="absolute inset-x-0 flex h-7 items-center"
                        style={{ top: i * SLOT_PX }}
                      >
                        <span className="w-7 text-center text-[10px] font-semibold text-muted-foreground tabular-nums">
                          {i % 4 === 0
                            ? String(DAY_START / 60 + i / 4).padStart(2, "0")
                            : ""}
                        </span>
                        <span className="flex-1 text-center text-[10px] text-muted-foreground tabular-nums">
                          {String((i % 4) * 15).padStart(2, "0")}
                        </span>
                      </div>
                    ))}
                    {Array.from(
                      { length: (DAY_END - DAY_START) / 15 },
                      (_, i) => i,
                    )
                      .filter((i) => i !== 0)
                      .map((i) => (
                        <div
                          key={`axis-${i}`}
                          className={
                            i % 4 === 0
                              ? "absolute inset-x-0 border-t border-dashed border-border"
                              : "absolute inset-x-0 border-t border-border/60"
                          }
                          style={{ top: i * SLOT_PX }}
                        />
                      ))}
                    <div className="absolute inset-y-0 left-7 w-px bg-border" />
                  </div>
                </div>
                {columns.map((col) => {
                  const dayCards = byColumn.get(col.key) ?? [];
                  const laidOut = assignLanes(dayCards);
                  return (
                    <div
                      key={col.key}
                      className={`relative flex-1 border-l border-border/50 ${
                        col.date === today
                          ? "bg-primary/[0.05]"
                          : view === "week" &&
                              [0, 6].includes(dayjs(col.date).day())
                            ? "bg-muted/40"
                            : ""
                      }`}
                      style={{ height: gridHeight }}
                      data-col-date={col.date}
                      data-col-doctor={col.doctor}
                      onPointerDown={(e) => beginNewDrag(e, col)}
                      onDoubleClick={(e) => {
                        if (!can(me, "appointment.create")) return;
                        if (drawerOpen) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const raw =
                          DAY_START + (e.clientY - rect.top) / PX_PER_MIN;
                        const snapped = Math.min(
                          DAY_END - 15,
                          Math.max(DAY_START, Math.round(raw / 15) * 15),
                        );
                        setDraftDate(col.date);
                        setDraftStart(timeAt(snapped));
                        setDraftDuration(15);
                        setEditing(null);
                        setDrawerOpen(true);
                      }}
                    >
                      {HOURS.filter((h) => h !== 8).map((h) => (
                        <div
                          key={h}
                          className="absolute inset-x-0 border-t border-dashed border-border"
                          style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }}
                        />
                      ))}
                      {Array.from(
                        { length: (DAY_END - DAY_START) / 15 },
                        (_, i) => i,
                      )
                        .filter((i) => i % 4 !== 0)
                        .map((i) => (
                          <div
                            key={`q-${i}`}
                            className="absolute inset-x-0 border-t border-border/60"
                            style={{ top: i * 15 * PX_PER_MIN }}
                          />
                        ))}
                      {col.date === today &&
                      nowMinutes > DAY_START &&
                      nowMinutes < DAY_END ? (
                        <div
                          className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-destructive/70"
                          style={{ top: nowTop }}
                        />
                      ) : null}
                      {(() => {
                        const dur =
                          draftDuration ?? meta?.defaultDuration ?? 30;
                        const active =
                          drag?.kind === "new" &&
                          drag.moved &&
                          drag.date === col.date;
                        const placed =
                          drawerOpen &&
                          !editing &&
                          draftDate === col.date &&
                          !(drag?.kind === "new" && drag.moved);
                        if (!active && !placed) return null;
                        const start = active ? drag.start : draftStart;
                        const top = Math.max(
                          0,
                          (minutesOf(start) - DAY_START) * PX_PER_MIN,
                        );
                        return (
                          <div
                            onPointerDown={beginFloatDrag}
                            className="absolute right-[2px] left-[2px] z-20 cursor-grab touch-none overflow-hidden rounded-lg border-l-[3px] border-slate-500 bg-slate-600 px-2 py-0.5 text-left text-sm leading-tight text-white shadow-md select-none"
                            style={{
                              top,
                              height: Math.max(16, dur * PX_PER_MIN - 2),
                            }}
                          >
                            <span className="flex items-center justify-between gap-1">
                              <span className="truncate font-semibold">
                                新预约
                              </span>
                            </span>
                            {dur * PX_PER_MIN >= 36 ? (
                              <span className="block truncate text-sm tabular-nums opacity-80">
                                {start} - {timeAt(minutesOf(start) + dur)}
                              </span>
                            ) : null}
                            <span
                              className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                              onPointerDown={(e) => e.stopPropagation()}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setDraftResize({
                                  startY: e.clientY,
                                  origDuration: dur,
                                });
                              }}
                            />
                          </div>
                        );
                      })()}
                      {drag &&
                      drag.moved &&
                      drag.kind === "pending" &&
                      drag.date === col.date ? (
                        <div
                          className="pointer-events-none absolute right-[2px] left-[2px] z-20 overflow-hidden rounded-lg border-l-[3px] px-2 py-0.5 text-left text-sm leading-tight shadow-md"
                          style={{
                            top:
                              (minutesOf(drag.start) - DAY_START) * PX_PER_MIN,
                            height: Math.max(16, 30 * PX_PER_MIN - 2),
                            backgroundColor: APPOINTMENT_TONES.pending.bg,
                            borderLeftColor: APPOINTMENT_TONES.pending.bar,
                          }}
                        >
                          <span className="block truncate font-semibold">
                            {drag.pending?.patientName}
                          </span>
                          <span className="block truncate tabular-nums opacity-80">
                            {drag.start} - {drag.end}
                          </span>
                        </div>
                      ) : null}{" "}
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
                            onPointerDown={(e) => beginCardDrag(e, card)}
                            onClick={(e) => {
                              if (!canOperate(card.id)) return;
                              if (Date.now() - lastResizeAt.current < 400) {
                                return;
                              }
                              if (Date.now() - lastDragAt.current < 300) {
                                return;
                              }
                              setPopoverAnchor(e.currentTarget);
                              setSelected(card);
                              setPopoverOpen(true);
                            }}
                            className="absolute touch-none overflow-hidden rounded-lg border-l-[3px] px-2 py-0.5 text-left text-sm leading-tight shadow-sm transition-shadow select-none hover:shadow-md"
                            style={{
                              top,
                              height,
                              left: `calc(${card.lane * width}% + 2px)`,
                              width: `calc(${width}% - 4px)`,
                              backgroundColor: tone.bg,
                              borderLeftColor: tone.bar,
                              zIndex:
                                drag?.kind === "card" &&
                                drag.card?.id === card.id
                                  ? 30
                                  : undefined,
                              boxShadow:
                                drag?.kind === "card" &&
                                drag.card?.id === card.id
                                  ? "0 8px 20px rgba(0,0,0,.25)"
                                  : undefined,
                            }}
                          >
                            <span className="flex items-center gap-1">
                              <span className="truncate font-semibold">
                                {card.patientName}
                              </span>
                              {card.doctor ? (
                                <span className="shrink-0 truncate text-sm text-muted-foreground">
                                  · {card.doctor}
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
                              <span className="block truncate text-sm tabular-nums opacity-70">
                                {card.startTime} - {previewEnd}
                              </span>
                            ) : null}
                            <span
                              className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                              onPointerDown={(e) => e.stopPropagation()}
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
      <Popover
        open={popoverOpen}
        onOpenChange={(open) => {
          if (!open) setPopoverOpen(false);
        }}
        onOpenChangeComplete={(open) => {
          if (!open) {
            setSelected(null);
            setPopoverAnchor(null);
          }
        }}
      >
        <PopoverContent
          anchor={popoverAnchor ?? undefined}
          side="right"
          align="start"
          sideOffset={8}
          className="w-[380px] gap-0 overflow-hidden rounded-xl p-0"
        >
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">
                    {selected.patientName}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: toneOf(selected).bar }}
                    />
                    {toneOf(selected).label}
                  </span>
                  {selected.arrived ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      已到店
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label="关闭"
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                  onClick={() => setSelected(null)}
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="flex flex-col gap-2 px-4 py-3 text-sm">
                <p className="text-muted-foreground">
                  {selected.chartNo}
                  {selected.age ? ` · ${selected.age}岁` : ""}
                  {selected.gender ? ` · ${selected.gender}` : ""}
                </p>
                <p className="text-muted-foreground">{selected.phone || "—"}</p>
                <Separator />
                <div className="grid grid-cols-[72px_1fr] gap-x-2 gap-y-1.5">
                  <span className="text-muted-foreground">预约时间</span>
                  <span>
                    {selected.visitDate}
                    {selected.startTime
                      ? ` ${selected.startTime} - ${selected.endTime}`
                      : "（待定）"}
                  </span>
                  <span className="text-muted-foreground">医生</span>
                  <span>{selected.doctor || "未指定"}</span>
                  <span className="text-muted-foreground">预约项目</span>
                  <span>
                    {selected.items.length ? selected.items.join("、") : "—"}
                  </span>
                  <span className="text-muted-foreground">预约备注</span>
                  <span>{selected.remark || "—"}</span>
                </div>
                <Separator />
                <div className="flex flex-wrap justify-end gap-2 pt-1">
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
                          setPopoverOpen(false);
                          setDrawerOpen(true);
                        }}
                      >
                        改约
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setReasonOpen(true);
                          setReason({ card: selected, action: "miss" });
                          setReasonText("");
                          setPopoverOpen(false);
                        }}
                      >
                        失约
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setReasonOpen(true);
                          setReason({ card: selected, action: "cancel" });
                          setReasonText("");
                          setPopoverOpen(false);
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
                </div>
              </div>
            </>
          ) : null}
        </PopoverContent>
      </Popover>{" "}
      <Dialog
        open={pendingBookOpen}
        onOpenChange={(open) => {
          if (!open) setPendingBookOpen(false);
        }}
        onOpenChangeComplete={(open) => {
          if (!open) setPendingBook(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认预约</DialogTitle>
          </DialogHeader>
          {pendingBook ? (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-muted-foreground">
                将「{pendingBook.row.patientName}」排到{" "}
                <span className="font-medium text-foreground">
                  {pendingBook.visitDate} {pendingBook.startTime}
                </span>
                ，确认排期？
              </p>
              <div className="grid grid-cols-[72px_1fr] items-center gap-2">
                <span className="text-right text-muted-foreground">医生</span>
                <span>{pendingBook.doctor || "未指定"}</span>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPendingBookOpen(false);
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void confirmPendingBook()}
            >
              确认预约
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirmMoveOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmMoveOpen(false);
        }}
        onOpenChangeComplete={(open) => {
          if (!open) {
            setConfirmMove(null);
            setPendingMove(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认修改预约时间</DialogTitle>
          </DialogHeader>
          {confirmMove ? (
            <p className="text-sm text-muted-foreground">
              将「{confirmMove.card.patientName}」的预约从{" "}
              <span className="font-medium text-foreground">
                {confirmMove.card.startTime} - {confirmMove.card.endTime}
              </span>{" "}
              调整为{" "}
              <span className="font-medium text-foreground">
                {confirmMove.startTime} - {confirmMove.endTime}
              </span>
              ？
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setConfirmMoveOpen(false);
                setPendingMove(null);
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void confirmMoveNow()}
            >
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>{" "}
      {/* 失约/取消原因 */}
      <Dialog
        open={reasonOpen}
        onOpenChange={(open) => {
          if (!open) setReasonOpen(false);
        }}
        onOpenChangeComplete={(open) => {
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
      <AppointmentDrawer
        open={drawerOpen}
        onOpenChange={(next) => {
          if (!next) {
            setPendingMove(null);
          }
          setDrawerOpen(next);
        }}
        meta={meta}
        initial={editing}
        defaultDate={draftDate}
        defaultStart={draftStart}
        defaultDuration={draftDuration}
        durationSync={editing ? undefined : draftDuration}
        timeSync={timeSync}
        onScheduleChange={(v) => {
          if (editing) return;
          setDraftDate(v.visitDate);
          setDraftStart(v.startTime);
          setDraftDuration(v.durationMinutes);
        }}
        onSaved={() => {
          setPendingMove(null);
          return load();
        }}
      />
    </div>
  );
}
