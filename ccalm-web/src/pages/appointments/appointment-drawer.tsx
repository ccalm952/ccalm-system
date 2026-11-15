import * as React from "react";
import dayjs from "dayjs";
import { Pencil, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  PatientNameCombobox,
  type PatientMatch,
} from "@/components/patient-name-combobox";
import { DatePickerField } from "@/components/date-picker-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/time-picker";
import { api } from "@/lib/api";
import type {
  AppointmentCard,
  AppointmentMeta,
} from "@/lib/appointments/types";
import { errorMessage } from "@/lib/errorMessage";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meta: AppointmentMeta | null;
  initial: AppointmentCard | null;
  defaultDate: string;
  defaultStart?: string;
  defaultDuration?: number;
  durationSync?: number | null;
  onScheduleChange?: (v: {
    visitDate: string;
    startTime: string;
    durationMinutes: number;
  }) => void;
  timeSync?: {
    visitDate: string;
    startTime: string;
    endTime: string;
    nonce: number;
  } | null;
  onSaved: () => void | Promise<void>;
};

type Upcoming = {
  id: number;
  visitDate: string;
  startTime: string;
  doctor: string;
  items: string[];
  isPending: boolean;
};

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90];

function ageOf(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const age = dayjs().diff(dayjs(birthday), "year");
  return Number.isFinite(age) && age >= 0 ? age : null;
}

function Row({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">
        {required ? <span className="text-destructive">*</span> : null}
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function InlineRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[56px_1fr] items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AppointmentDrawer({
  open,
  onOpenChange,
  meta,
  initial,
  defaultDate,
  defaultStart = "09:00",
  defaultDuration,
  durationSync,
  onScheduleChange,
  timeSync,
  onSaved,
}: Props) {
  const onScheduleRef = React.useRef(onScheduleChange);
  onScheduleRef.current = onScheduleChange;
  const defaultsRef = React.useRef({
    defaultDate,
    defaultStart,
    defaultDuration,
    fallbackDuration: meta?.defaultDuration,
  });
  defaultsRef.current = {
    defaultDate,
    defaultStart,
    defaultDuration,
    fallbackDuration: meta?.defaultDuration,
  };
  const [patient, setPatient] = React.useState<PatientMatch | null>(null);
  const [patientName, setPatientName] = React.useState("");
  const [patientSearchOpen, setPatientSearchOpen] = React.useState(true);
  const [visitDate, setVisitDate] = React.useState(defaultDate);
  const [startTime, setStartTime] = React.useState(defaultStart);
  const [duration, setDuration] = React.useState(30);
  const [doctor, setDoctor] = React.useState("");
  const [kind, setKind] = React.useState<"first" | "return">("return");
  const [items, setItems] = React.useState<string[]>([]);
  const [remark, setRemark] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [itemQuery, setItemQuery] = React.useState("");
  const [itemsOpen, setItemsOpen] = React.useState(false);
  const [upcoming, setUpcoming] = React.useState<Upcoming[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setPatient(null);
    setPatientName(initial?.patientName ?? "");
    setPatientSearchOpen(!initial);
    const d = defaultsRef.current;
    setVisitDate(initial?.visitDate ?? d.defaultDate);
    setStartTime(initial?.startTime || d.defaultStart);
    setDuration(
      initial?.startTime && initial?.endTime
        ? Math.max(
            15,
            Math.min(
              120,
              dayjs(`2000-01-01 ${initial.endTime}`).diff(
                dayjs(`2000-01-01 ${initial.startTime}`),
                "minute",
              ),
            ),
          )
        : (d.defaultDuration ?? d.fallbackDuration ?? 30),
    );
    setDoctor(initial?.doctor ?? "");
    setKind(initial?.kind === "first" ? "first" : "return");
    setItems(initial?.items ?? []);
    setRemark(initial?.remark ?? "");
    setItemQuery("");
  }, [open, initial]);

  React.useEffect(() => {
    if (!open || !timeSync) return;
    setVisitDate(timeSync.visitDate);
    setStartTime(timeSync.startTime);
    setDuration(
      Math.max(
        15,
        Math.min(
          120,
          dayjs(`2000-01-01 ${timeSync.endTime}`).diff(
            dayjs(`2000-01-01 ${timeSync.startTime}`),
            "minute",
          ),
        ),
      ),
    );
  }, [open, timeSync]);
  React.useEffect(() => {
    if (!open || initial || durationSync == null) return;
    setDuration(durationSync);
  }, [open, initial, durationSync]);

  const confirming = Boolean(initial?.isPending);
  const patientId = patient?.id ?? initial?.patientId;

  React.useEffect(() => {
    if (!open || !patientId) {
      setUpcoming([]);
      return;
    }
    let cancelled = false;
    api<Upcoming[]>("GET", `/appointments/upcoming?patientId=${patientId}`)
      .then((rows) => {
        if (!cancelled) {
          setUpcoming(rows.filter((r) => r.id !== initial?.id));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, patientId, initial?.id]);

  function toggleItem(name: string, checked: boolean) {
    setItems((list) =>
      checked ? [...new Set([...list, name])] : list.filter((i) => i !== name),
    );
  }

  async function save(asPending: boolean) {
    const pid = patient?.id ?? initial?.patientId;
    if (!pid) {
      toast.error("请先选择患者");
      return;
    }
    if (!visitDate) {
      toast.error("请选择预约日期");
      return;
    }
    if (!doctor) {
      toast.error("请选择医生（待定预约也需要选择医生）");
      return;
    }
    if (!asPending && !startTime) {
      toast.error("请选择预约时间");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        patientId: pid,
        visitDate,
        startTime: asPending ? undefined : startTime,
        durationMinutes: duration,
        doctor: doctor || undefined,
        kind,
        items,
        remark,
        isPending: asPending,
      };
      if (initial) await api("PUT", `/appointments/${initial.id}`, body);
      else await api("POST", "/appointments", body);
      toast.success(
        asPending ? "已保存为待定预约" : confirming ? "已确认预约" : "已保存",
      );
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const selectedPatient = patient ?? null;
  const displayAge = selectedPatient ? ageOf(selectedPatient.birthday) : null;

  const filteredCategories = React.useMemo(() => {
    const q = itemQuery.trim();
    const categories = meta?.items ?? [];
    if (!q) return categories;
    return categories
      .map((c) => ({
        ...c,
        items: c.items.filter((i) => i.name.includes(q)),
      }))
      .filter((c) => c.items.length || c.name.includes(q));
  }, [meta, itemQuery]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      disablePointerDismissal
    >
      <SheetContent
        showOverlay={false}
        showCloseButton={false}
        className="flex flex-col p-0"
        style={{
          width: "min(96vw, 440px)",
          maxWidth: "none",
          top: "3.5rem",
          height: "calc(100svh - 3.5rem)",
        }}
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <SheetTitle className="flex h-8 items-center">
            {initial ? "修改预约" : "新建预约"}
          </SheetTitle>
          <SheetClose className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <X className="size-4" />
            <span className="sr-only">关闭</span>
          </SheetClose>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="size-full" viewportClassName="px-4 py-4">
            <div className="flex flex-col gap-4">
              <section className="flex flex-col gap-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  患者信息
                </h4>
                {patientSearchOpen || !patientId ? (
                  <div className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                      <PatientNameCombobox
                        value={patientName}
                        onValueChange={(v) => {
                          setPatientName(v);
                          setPatient(null);
                        }}
                        onSelect={(p) => {
                          setPatient(p);
                          setPatientName(p.name);
                          setPatientSearchOpen(false);
                        }}
                        placeholder="搜索患者"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <InlineRow label="患者">
                      <span className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {selectedPatient?.name ?? initial?.patientName}
                        </span>
                        {(() => {
                          const age = displayAge ?? initial?.age ?? null;
                          return age ? (
                            <span className="text-muted-foreground">
                              {age}岁
                            </span>
                          ) : null;
                        })()}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sm text-primary"
                          onClick={() => {
                            setPatientName(
                              selectedPatient?.name ??
                                initial?.patientName ??
                                "",
                            );
                            setPatientSearchOpen(true);
                          }}
                        >
                          <Pencil className="size-3" />
                          编辑
                        </button>
                      </span>
                    </InlineRow>
                    <InlineRow label="手机">
                      <span className="text-sm">
                        {selectedPatient?.phone || initial?.phone || "—"}
                      </span>
                    </InlineRow>
                    <InlineRow label="病历号">
                      <span className="text-sm">
                        {selectedPatient?.chartNo || initial?.chartNo || "—"}
                      </span>
                    </InlineRow>
                  </div>
                )}

                {upcoming.length ? (
                  <div className="mt-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900">
                    <p className="font-medium">该患者已有预约</p>
                    {upcoming.map((u) => (
                      <p key={u.id} className="truncate">
                        {u.visitDate} {u.startTime || "待定"}
                        {u.items.length ? ` · ${u.items.join("/")}` : ""}
                        {u.doctor ? ` · ${u.doctor}` : ""}
                      </p>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="flex flex-col gap-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  预约信息
                </h4>
                {confirming ? (
                  <div className="rounded-lg border border-pink-200 bg-pink-50/60 px-2.5 py-1.5 text-sm text-pink-900">
                    待定预约：选好时间和医生后点「确认预约」即可排入看板。
                  </div>
                ) : null}{" "}
                <Row label="就诊类型">
                  <Select
                    items={[
                      { value: "first", label: "初诊" },
                      { value: "return", label: "复诊" },
                    ]}
                    value={kind}
                    onValueChange={(v) => {
                      if (v === "first" || v === "return") setKind(v);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">初诊</SelectItem>
                      <SelectItem value="return">复诊</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="预约时间" required>
                  <div className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                      <DatePickerField
                        value={visitDate}
                        onValueChange={(v) => {
                          setVisitDate(v);
                          onScheduleChange?.({
                            visitDate: v,
                            startTime,
                            durationMinutes: duration,
                          });
                        }}
                      />
                    </div>
                    <TimePicker
                      value={startTime}
                      onChange={(v) => {
                        setStartTime(v);
                        onScheduleChange?.({
                          visitDate,
                          startTime: v,
                          durationMinutes: duration,
                        });
                      }}
                      className="w-28 border-border bg-background"
                    />
                  </div>
                </Row>
                <Row label="持续时间" required>
                  <Select
                    items={DURATION_OPTIONS.map((d) => ({
                      value: String(d),
                      label: `${d} 分钟`,
                    }))}
                    value={String(duration)}
                    onValueChange={(v) => {
                      if (!v) return;
                      setDuration(Number(v));
                      onScheduleChange?.({
                        visitDate,
                        startTime,
                        durationMinutes: Number(v),
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} 分钟
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="医生" required>
                  <Select
                    value={doctor || null}
                    onValueChange={(v) => {
                      if (v) setDoctor(v);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full">
                      <SelectValue placeholder="选择医生" />
                    </SelectTrigger>
                    <SelectContent>
                      {(meta?.doctors ?? []).map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="预约项目">
                  <Popover open={itemsOpen} onOpenChange={setItemsOpen}>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 w-full justify-between font-normal"
                        />
                      }
                    >
                      <span className="truncate">
                        {items.length ? items.join("、") : "选择项目"}
                      </span>
                      <span className="ml-2 shrink-0 text-sm text-muted-foreground">
                        {items.length ? `${items.length} 项` : ""}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 gap-0 p-0">
                      <div className="border-b p-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute top-2 left-2 size-3.5 text-muted-foreground" />
                          <Input
                            value={itemQuery}
                            onChange={(e) => setItemQuery(e.target.value)}
                            placeholder="搜索预约项目"
                            className="h-8 pl-7"
                          />
                        </div>
                      </div>
                      <div className="max-h-72 overflow-hidden">
                        <ScrollArea
                          className="size-full"
                          viewportClassName="p-3"
                        >
                          <div className="flex flex-col gap-2">
                            {filteredCategories.map((cat) => (
                              <div key={cat.id} className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-muted-foreground">
                                  {cat.name}
                                </span>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                                  {cat.items.map((item) => (
                                    <label
                                      key={item.id}
                                      className="flex items-center gap-1.5 text-sm"
                                    >
                                      <Checkbox
                                        checked={items.includes(item.name)}
                                        onCheckedChange={(v) =>
                                          toggleItem(item.name, v === true)
                                        }
                                      />
                                      <span className="truncate">
                                        {item.name}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {!filteredCategories.length ? (
                              <p className="py-4 text-center text-sm text-muted-foreground">
                                没有匹配的项目
                              </p>
                            ) : null}
                          </div>
                        </ScrollArea>
                      </div>
                    </PopoverContent>
                  </Popover>
                </Row>
                <Row label="备注">
                  <Textarea
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="请输入预约备注"
                    rows={2}
                  />
                </Row>
              </section>
            </div>
          </ScrollArea>
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="default"
            disabled={saving}
            onClick={() => void save(true)}
          >
            {confirming ? "保持待定" : "保存为待定"}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void save(false)}
            >
              {confirming ? "确认预约" : "保存预约"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
