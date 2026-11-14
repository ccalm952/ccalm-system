import * as React from "react";
import dayjs from "dayjs";
import { toast } from "sonner";

import {
  PatientNameCombobox,
  type PatientMatch,
} from "@/components/patient-name-combobox";
import { DatePickerField } from "@/components/date-picker-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
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
  onSaved: () => void | Promise<void>;
};

export function AppointmentDrawer({
  open,
  onOpenChange,
  meta,
  initial,
  defaultDate,
  defaultStart = "09:00",
  onSaved,
}: Props) {
  const [patient, setPatient] = React.useState<PatientMatch | null>(null);
  const [patientName, setPatientName] = React.useState("");
  const [visitDate, setVisitDate] = React.useState(defaultDate);
  const [startTime, setStartTime] = React.useState("09:00");
  const [duration, setDuration] = React.useState(30);
  const [doctor, setDoctor] = React.useState("");
  const [kind, setKind] = React.useState<"first" | "return">("return");
  const [items, setItems] = React.useState<string[]>([]);
  const [remark, setRemark] = React.useState("");
  const [force, setForce] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setPatient(null);
    setPatientName(initial?.patientName ?? "");
    setVisitDate(initial?.visitDate ?? defaultDate);
    setStartTime(initial?.startTime || defaultStart);
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
        : (meta?.defaultDuration ?? 30),
    );
    setDoctor(initial?.doctor ?? "");
    setKind(initial?.kind === "first" ? "first" : "return");
    setItems(initial?.items ?? []);
    setRemark(initial?.remark ?? "");
    setForce(false);
  }, [open, initial, defaultDate, defaultStart, meta?.defaultDuration]);

  function toggleItem(name: string, checked: boolean) {
    setItems((list) =>
      checked ? [...new Set([...list, name])] : list.filter((i) => i !== name),
    );
  }

  async function save(asPending: boolean) {
    const patientId = initial?.patientId ?? patient?.id;
    if (!patientId) {
      toast.error("请先选择患者");
      return;
    }
    if (!visitDate) {
      toast.error("请选择预约日期");
      return;
    }
    if (!asPending && (!startTime || !doctor)) {
      toast.error("请选择预约时间和医生（或保存为待定）");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        patientId,
        visitDate,
        startTime: asPending ? "" : startTime,
        durationMinutes: duration,
        doctor: asPending ? "" : doctor,
        kind,
        items,
        remark,
        isPending: asPending,
        force,
      };
      if (initial) await api("PUT", `/appointments/${initial.id}`, body);
      else await api("POST", "/appointments", body);
      toast.success(asPending ? "已保存为待定预约" : "已保存");
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const titles = initial ? "编辑预约" : "新建预约";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{titles}</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col gap-1.5">
            <Label>患者</Label>
            {initial ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{initial.patientName}</span>
                <span className="text-muted-foreground">
                  {initial.chartNo}
                  {initial.age ? ` · ${initial.age}岁` : ""}
                </span>
              </div>
            ) : (
              <>
                <PatientNameCombobox
                  value={patientName}
                  onValueChange={(v) => {
                    setPatientName(v);
                    setPatient(null);
                  }}
                  onSelect={(p) => {
                    setPatient(p);
                    setPatientName(p.name);
                  }}
                  placeholder="搜索患者姓名/拼音/手机/病历号"
                />
                {patient ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{patient.chartNo}</Badge>
                    <span>{patient.phone}</span>
                    {patient.gender ? <span>{patient.gender}</span> : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    必须选择已有患者；新患者请先到「患者」里建档
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>预约日期</Label>
            <DatePickerField value={visitDate} onValueChange={setVisitDate} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>开始时间</Label>
              <Input
                type="time"
                step={900}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>持续时间</Label>
              <Select
                items={(meta?.durations ?? [15, 30, 45, 60, 90, 120]).map(
                  (d) => ({ value: String(d), label: `${d} 分钟` }),
                )}
                value={String(duration)}
                onValueChange={(v) => {
                  if (v) setDuration(Number(v));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(meta?.durations ?? [15, 30, 45, 60, 90, 120]).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d} 分钟
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>医生</Label>
              <Select
                value={doctor || null}
                onValueChange={(v) => {
                  if (v) setDoctor(v);
                }}
              >
                <SelectTrigger className="w-full">
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
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>就诊类型</Label>
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
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">初诊</SelectItem>
                  <SelectItem value="return">复诊</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>预约项目</Label>
            <div className="flex max-h-44 flex-col gap-2 overflow-y-auto rounded-lg border p-2">
              {(meta?.items ?? []).map((cat) => (
                <div key={cat.id} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {cat.name}
                  </span>
                  <div className="grid grid-cols-2 gap-1">
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
                        {item.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>备注</Label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="选填"
              rows={2}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={force}
              onCheckedChange={(v) => setForce(v === true)}
            />
            医生该时段已有预约时也强制保存
          </label>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => void save(true)}
          >
            保存为待定
          </Button>
          <Button
            type="button"
            disabled={saving}
            onClick={() => void save(false)}
          >
            保存预约
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
