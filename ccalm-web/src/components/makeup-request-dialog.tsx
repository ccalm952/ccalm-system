import * as React from "react";
import dayjs from "dayjs";

import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/time-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ATTENDANCE_PUNCH_TYPE_LABEL,
  type AttendanceMakeupRequest,
  type AttendancePunchType,
} from "@/lib/attendance/types";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";
import { toast } from "@/components/ui/sonner";

type EmployeeMakeupPunchType = Extract<
  AttendancePunchType,
  "morning_in" | "morning_out" | "afternoon_in" | "afternoon_out"
>;
type AdminDirectPunchType = AttendancePunchType;

const DEFAULT_MAKEUP_TIME: Record<AdminDirectPunchType, string> = {
  morning_in: "08:30",
  morning_out: "12:00",
  afternoon_in: "14:30",
  afternoon_out: "18:00",
};

export function MakeupRequestDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  type: EmployeeMakeupPunchType | AdminDirectPunchType;
  mode?: "request" | "direct";
  userId?: string;
  userName?: string;
  onSuccess: () => void;
}) {
  const {
    open,
    onOpenChange,
    date,
    type,
    mode = "request",
    userId,
    userName,
    onSuccess,
  } = props;
  const [time, setTime] = React.useState("12:00");
  const [submitting, setSubmitting] = React.useState(false);
  const isDirect = mode === "direct";

  React.useEffect(() => {
    if (!open) return;
    setTime(DEFAULT_MAKEUP_TIME[type]);
  }, [open, type, date]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const timeValue = time.slice(0, 5);
      if (isDirect) {
        if (!userId) {
          toast.error("缺少员工信息");
          return;
        }
        await api("POST", "/attendance/makeup", {
          userId,
          date,
          type,
          time: timeValue,
        });
        toast.success("补卡成功");
      } else {
        await api<AttendanceMakeupRequest>("POST", "/attendance/makeup-requests", {
          date,
          type,
          time: timeValue,
        });
        toast.success("补卡申请已提交");
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
          <DialogTitle>{isDirect ? "补卡" : "申请补卡"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-1 text-sm">
            {isDirect && userName ? <div>员工：{userName}</div> : null}
            <div>日期：{dayjs(date).format("YYYY年M月D日")}</div>
            <div>类型：{ATTENDANCE_PUNCH_TYPE_LABEL[type]}</div>
          </div>
          <TimePicker
            id="makeup-time"
            label="补卡时间"
            value={time}
            onChange={setTime}
            disabled={submitting}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? "提交中…" : isDirect ? "确认补卡" : "提交申请"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
