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
  FOLLOW_UP_TYPE_OPTIONS,
  type FollowUpType,
} from "@/lib/follow-ups/options";
import type { FollowUp } from "@/lib/follow-ups/types";
import { StaffCombobox } from "./staff-combobox";

type FormState = {
  planDate: string;
  type: FollowUpType;
  content: string;
  doctor: string;
};

function toForm(followUp: FollowUp | null): FormState {
  return {
    planDate: followUp?.planDate ?? dayjs().format("YYYY-MM-DD"),
    type: followUp?.type ?? "postop",
    content: followUp?.content ?? "",
    doctor: followUp?.doctor ?? "",
  };
}

export function FollowUpDialog({
  open,
  onOpenChange,
  patientId,
  followUp,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  followUp: FollowUp | null;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = React.useState<FormState>(() => toForm(followUp));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm(toForm(followUp));
  }, [open, followUp]);

  async function save() {
    if (!form.planDate) {
      toast.error("请选择计划随访日期");
      return;
    }
    setSaving(true);
    try {
      const body = {
        patientId,
        planDate: form.planDate,
        type: form.type,
        content: form.content.trim(),
        doctor: form.doctor.trim(),
      };
      if (followUp) {
        await api("PUT", `/follow-ups/${followUp.id}`, body);
      } else {
        await api("POST", "/follow-ups", body);
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
          <DialogTitle>{followUp ? "编辑随访" : "新建随访"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <DatePickerField
            value={form.planDate}
            onValueChange={(v) => setForm((f) => ({ ...f, planDate: v }))}
            placeholder="计划随访日期"
          />
          <Select
            items={FOLLOW_UP_TYPE_OPTIONS}
            value={form.type}
            onValueChange={(v: FollowUpType | null) => {
              if (v) setForm((f) => ({ ...f, type: v }));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {FOLLOW_UP_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="随访内容（发给员工看的提示）"
            value={form.content}
            onChange={(e) =>
              setForm((f) => ({ ...f, content: e.target.value }))
            }
          />
          <StaffCombobox
            placeholder="随访医生 / 执行人"
            value={form.doctor}
            onValueChange={(v) => setForm((f) => ({ ...f, doctor: v }))}
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
