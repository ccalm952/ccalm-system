import * as React from "react";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import {
  FOLLOW_UP_SATISFACTION_OPTIONS,
  followUpTypeLabel,
} from "@/lib/follow-ups/options";
import type { FollowUp } from "@/lib/follow-ups/types";

const SATISFACTION_OPTIONS = [
  { value: "none", label: "未评价" },
  ...FOLLOW_UP_SATISFACTION_OPTIONS,
];

type FormState = {
  result: string;
  satisfaction: string;
  nextPlanDate: string;
};

const EMPTY_FORM: FormState = {
  result: "",
  satisfaction: "none",
  nextPlanDate: "",
};

export function CompleteFollowUpDialog({
  open,
  onOpenChange,
  followUp,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  followUp: FollowUp | null;
  onDone: () => void | Promise<void>;
}) {
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm(EMPTY_FORM);
  }, [open, followUp]);

  async function save() {
    if (!followUp) return;
    setSaving(true);
    try {
      await api("POST", `/follow-ups/${followUp.id}/complete`, {
        result: form.result.trim(),
        satisfaction:
          form.satisfaction === "none" ? undefined : form.satisfaction,
        nextPlanDate: form.nextPlanDate || undefined,
      });
      toast.success("已记录随访");
      onOpenChange(false);
      await onDone();
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
          <DialogTitle>执行随访</DialogTitle>
          {followUp ? (
            <DialogDescription>
              {followUp.name} · {followUpTypeLabel(followUp.type)} · 计划{" "}
              {followUp.planDate}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="grid gap-4">
          <Textarea
            placeholder="随访结果（患者反馈、恢复情况等）"
            value={form.result}
            onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))}
          />
          <Select
            items={SATISFACTION_OPTIONS}
            value={form.satisfaction}
            onValueChange={(v: string | null) => {
              if (v) setForm((f) => ({ ...f, satisfaction: v }));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {SATISFACTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <DatePickerField
            value={form.nextPlanDate}
            onValueChange={(v) => setForm((f) => ({ ...f, nextPlanDate: v }))}
            placeholder="下次随访日期（可不填）"
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
            完成随访
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
