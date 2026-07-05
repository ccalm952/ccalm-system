import * as React from "react";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { restConfirmMessage, type RestHalf } from "@/lib/attendance/rest";
import type { ScheduleRestType } from "@/lib/attendance/types";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { useEnterToConfirm } from "@/lib/use-enter-to-confirm";
import { toast } from "sonner";

export function RestActionDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  half: RestHalf;
  mode: "declare" | "clear";
  declaredRest?: ScheduleRestType | null;
  userId?: string;
  userName?: string;
  onSuccess: () => void;
}) {
  const {
    open,
    onOpenChange,
    date,
    half,
    mode,
    declaredRest = null,
    userId,
    userName,
    onSuccess,
  } = props;
  const [submitting, setSubmitting] = React.useState(false);

  const message = restConfirmMessage(date, half, declaredRest, mode);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body = { date, half, ...(userId ? { userId } : {}) };
      if (mode === "declare") {
        await api("POST", "/attendance/rest", body);
        toast.success(userName ? `已为 ${userName} 登记休息` : "休息登记成功");
      } else {
        await api("POST", "/attendance/rest/clear", body);
        toast.success(userName ? `已取消 ${userName} 的休息登记` : "已取消休息登记");
      }
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  useEnterToConfirm(open, handleSubmit, submitting);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "declare"
              ? userName
                ? `为 ${userName} 登记休息`
                : "登记休息"
              : userName
                ? `取消 ${userName} 的休息`
                : "取消休息"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">
          <p>{message}</p>
          <p className="text-muted-foreground">日期：{dayjs(date).format("YYYY年M月D日")}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? (
              <>
                <Spinner data-icon="inline-start" />
                提交中…
              </>
            ) : (
              "确认"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
