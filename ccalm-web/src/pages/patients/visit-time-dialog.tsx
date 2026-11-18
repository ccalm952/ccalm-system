import * as React from "react";
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
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import type { PatientVisit } from "./patient-detail-types";

export function VisitTimeDialog({
  open,
  onOpenChange,
  visit,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: PatientVisit | null;
  onSaved: () => void | Promise<void>;
}) {
  const [date, setDate] = React.useState("");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && visit) {
      setDate(visit.visitDate);
      setStart(visit.startTime || "");
      setEnd(visit.endTime || "");
    }
  }, [open, visit]);

  async function save() {
    if (!visit) return;
    setSaving(true);
    try {
      await api("PUT", `/visits/${visit.id}`, {
        patientId: visit.patientId,
        visitDate: date,
        startTime: start,
        endTime: end,
        kind: visit.kind,
        status: visit.status,
        doctor: visit.doctor,
        remark: visit.remark,
      });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑就诊时间</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm text-muted-foreground">就诊日期</span>
            <DatePickerField value={date} onValueChange={setDate} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm text-muted-foreground">开始时间</span>
              <Input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm text-muted-foreground">结束时间</span>
              <Input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
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
