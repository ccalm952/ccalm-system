import * as React from "react";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatRemainingLeave,
  restConfirmMessage,
  type RestHalf,
} from "@/lib/attendance/rest";
import type { ScheduleRestType } from "@/lib/attendance/types";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { toast } from "@/components/ui/sonner";

export function RestActionDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  half: RestHalf;
  mode: "declare" | "clear";
  scheduleRest?: ScheduleRestType | null;
  remainingLeave?: number;
  onSuccess: () => void;
}) {
  const {
    open,
    onOpenChange,
    date,
    half,
    mode,
    scheduleRest = null,
    remainingLeave,
    onSuccess,
  } = props;
  const [submitting, setSubmitting] = React.useState(false);

  const message = restConfirmMessage(date, half, scheduleRest, mode);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (mode === "declare") {
        await api("POST", "/attendance/rest", { date, half });
        toast.success("休息登记成功");
      } else {
        await api("POST", "/attendance/rest/clear", { date, half });
        toast.success("已取消休息登记");
      }
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "declare" ? "登记休息" : "取消休息"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <p>{message}</p>
          {mode === "declare" && remainingLeave !== undefined ? (
            <p className="text-muted-foreground">
              当前剩余假期：{formatRemainingLeave(remainingLeave)} 天
            </p>
          ) : null}
          <p className="text-muted-foreground">
            日期：{dayjs(date).format("YYYY年M月D日")}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? "提交中…" : "确认"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
