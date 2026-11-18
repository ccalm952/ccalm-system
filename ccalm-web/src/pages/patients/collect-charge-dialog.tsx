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
import { PAY_METHODS } from "@/lib/charges/charge-calc";
import { errorMessage } from "@/lib/errorMessage";
import { visitKindLabel } from "@/lib/visits/visit-options";
import type { PatientVisit } from "./patient-detail-types";

export function CollectChargeDialog({
  open,
  onOpenChange,
  patientId,
  visits,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  visits: PatientVisit[];
  onSaved: () => void | Promise<void>;
}) {
  const [visitId, setVisitId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState(PAY_METHODS[0]);
  const [doctor, setDoctor] = React.useState("");
  const [doctors, setDoctors] = React.useState<string[]>([]);
  const [paidAt, setPaidAt] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const visitItems = visits.map((v) => ({
    value: String(v.id),
    label: `${v.visitDate} ${visitKindLabel(v.kind)}${
      v.appointmentId != null ? " · 已接诊" : ""
    }`,
  }));
  const doctorItems = [
    ...new Set([...doctors, ...visits.map((v) => v.doctor).filter(Boolean)]),
  ].map((name) => ({ value: name, label: name }));

  React.useEffect(() => {
    if (!open) return;
    setVisitId(visits[0] ? String(visits[0].id) : "");
    setAmount("");
    setMethod(PAY_METHODS[0]);
    setPaidAt(dayjs().format("YYYY-MM-DD"));
    setDoctor(visits[0]?.doctor ?? "");
  }, [open, visits]);

  React.useEffect(() => {
    if (!open) return;
    void api<string[]>("GET", "/patients/doctors")
      .then(setDoctors)
      .catch(() => setDoctors([]));
  }, [open]);

  async function save() {
    if (!visitId) {
      toast.error("请选择就诊");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("请填写收款金额");
      return;
    }
    setSaving(true);
    try {
      await api("POST", "/charges/collect", {
        patientId,
        visitId: Number(visitId),
        amount: value,
        method,
        doctor,
        paidAt,
      });
      toast.success("已收款");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>收费</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm text-muted-foreground">收款医生</span>
            <Select
              items={doctorItems}
              value={doctor}
              onValueChange={(v: string | null) => setDoctor(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择医生" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {doctorItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm text-muted-foreground">就诊</span>
            <Select
              items={visitItems}
              value={visitId}
              onValueChange={(v: string | null) => {
                setVisitId(v ?? "");
                const selected = visits.find((item) => String(item.id) === v);
                if (selected?.doctor) setDoctor(selected.doctor);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择就诊" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {visitItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm text-muted-foreground">收款金额</span>
            <Input
              value={amount}
              inputMode="decimal"
              placeholder="0.00"
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-sm text-muted-foreground">收款方式</span>
              <Select
                items={PAY_METHODS.map((m) => ({ value: m, label: m }))}
                value={method}
                onValueChange={(v: string | null) => setMethod(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PAY_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm text-muted-foreground">收款日期</span>
              <DatePickerField value={paidAt} onValueChange={setPaidAt} />
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            收款会自动记到该就诊对应的初诊病历治疗单上。
          </p>
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
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
