import * as React from "react";
import dayjs from "dayjs";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import {
  VISIT_KIND_OPTIONS,
  VISIT_STATUS_OPTIONS,
  type VisitKind,
  type VisitStatus,
} from "@/lib/visits/visit-options";
import type { PatientVisit } from "./patient-detail-types";
import { StaffCombobox } from "./staff-combobox";

type FormState = {
  visitDate: string;
  startTime: string;
  endTime: string;
  kind: VisitKind;
  status: VisitStatus;
  doctor: string;
  remark: string;
};

function toForm(visit: PatientVisit | null): FormState {
  return {
    visitDate: visit?.visitDate ?? dayjs().format("YYYY-MM-DD"),
    startTime: visit?.startTime ?? "",
    endTime: visit?.endTime ?? "",
    kind: visit?.kind ?? "return",
    status: visit?.status ?? "arrived",
    doctor: visit?.doctor ?? "",
    remark: visit?.remark ?? "",
  };
}

export function VisitDialog({
  open,
  onOpenChange,
  patientId,
  visit,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  visit: PatientVisit | null;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = React.useState<FormState>(() => toForm(visit));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm(toForm(visit));
  }, [open, visit]);

  async function save() {
    if (!form.visitDate) {
      toast.error("请选择就诊日期");
      return;
    }
    setSaving(true);
    try {
      const body = {
        patientId,
        ...form,
        doctor: form.doctor.trim(),
        remark: form.remark.trim(),
      };
      if (visit) {
        await api("PUT", `/visits/${visit.id}`, body);
      } else {
        await api("POST", "/visits", body);
      }
      toast.success("已保存");
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{visit ? "编辑就诊" : "新建就诊"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <DatePickerField
            value={form.visitDate}
            onValueChange={(v) => setForm((f) => ({ ...f, visitDate: v }))}
            placeholder="就诊日期"
          />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Input
              type="time"
              value={form.startTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, startTime: e.target.value }))
              }
            />
            <span className="text-muted-foreground">至</span>
            <Input
              type="time"
              value={form.endTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, endTime: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              items={VISIT_KIND_OPTIONS}
              value={form.kind}
              onValueChange={(v: VisitKind | null) => {
                if (v) setForm((f) => ({ ...f, kind: v }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {VISIT_KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              items={VISIT_STATUS_OPTIONS}
              value={form.status}
              onValueChange={(v: VisitStatus | null) => {
                if (v) setForm((f) => ({ ...f, status: v }));
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {VISIT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <StaffCombobox
            placeholder="医生"
            value={form.doctor}
            onValueChange={(v) => setForm((f) => ({ ...f, doctor: v }))}
          />
          <Input
            placeholder="备注"
            value={form.remark}
            onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
