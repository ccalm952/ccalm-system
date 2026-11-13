import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
import { PatientNameCombobox } from "@/components/patient-name-combobox";
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
import { ROUTES } from "@/config/routes";
import { errorMessage } from "@/lib/errorMessage";
import { parseTagsInput } from "@/lib/patients/groups";

export type PatientFormValue = {
  name: string;
  phone: string;
  chartNo: string;
  gender: string;
  birthday: string | null;
  tags: string[];
  remark: string;
};

type FormState = {
  name: string;
  phone: string;
  chartNo: string;
  gender: string;
  birthday: string;
  tags: string;
  remark: string;
};

const GENDER_OPTIONS = ["男", "女"];

function toForm(value?: PatientFormValue | null): FormState {
  return {
    name: value?.name ?? "",
    phone: value?.phone ?? "",
    chartNo: value?.chartNo ?? "",
    gender: value?.gender ?? "",
    birthday: value?.birthday ?? "",
    tags: value?.tags.join("，") ?? "",
    remark: value?.remark ?? "",
  };
}

export function PatientFormDialog({
  open,
  onOpenChange,
  patientId,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number | null;
  initial?: PatientFormValue | null;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = React.useState<FormState>(() => toForm(initial));
  const [saving, setSaving] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (open) setForm(toForm(initial));
  }, [open, initial]);

  async function save() {
    const name = form.name.trim();
    if (!name) {
      toast.error("请填写姓名");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name,
        phone: form.phone.trim(),
        chartNo: form.chartNo.trim(),
        gender: form.gender,
        birthday: form.birthday.trim() || null,
        tags: parseTagsInput(form.tags),
        remark: form.remark.trim(),
      };
      if (patientId == null) {
        await api("POST", "/patients", body);
        toast.success("已添加");
      } else {
        await api("PUT", `/patients/${patientId}`, body);
        toast.success("已保存");
      }
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
          <DialogTitle>{patientId == null ? "添加" : "编辑"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {patientId == null ? (
            <PatientNameCombobox
              value={form.name}
              onValueChange={(v) => setForm((f) => ({ ...f, name: v }))}
              onSelect={(p) => {
                onOpenChange(false);
                void navigate(ROUTES.patients.detail(p.id));
              }}
            />
          ) : (
            <Input
              placeholder="姓名"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          )}
          <Input
            placeholder="手机"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            placeholder="病历号"
            value={form.chartNo}
            onChange={(e) =>
              setForm((f) => ({ ...f, chartNo: e.target.value }))
            }
          />
          <Select
            value={form.gender || null}
            onValueChange={(v: string | null) =>
              setForm((f) => ({ ...f, gender: v ?? "" }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="性别" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {GENDER_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <DatePickerField
            value={form.birthday}
            onValueChange={(v) => setForm((f) => ({ ...f, birthday: v }))}
            placeholder="生日"
          />
          <Input
            placeholder="标签，多个用逗号分隔"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
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
