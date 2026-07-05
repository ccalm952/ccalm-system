import { Button } from "@/components/ui/button";
import { attendancePendingTextClass } from "@/lib/attendance/attendance-theme";
import {
  adminMakeupSlotStateWithPending,
  makeupSlotState,
  type AdminMakeupType,
  type MakeupOutType,
  type MakeupTodayGate,
} from "@/lib/attendance/makeup";
import type { AttendanceMakeupRequest, AttendancePunchDayRow } from "@/lib/attendance/types";
import { cn } from "@/lib/utils";

type AttendanceOutCellProps =
  | {
      row: AttendancePunchDayRow;
      type: AdminMakeupType;
      time: string | null;
      adminDirect: true;
      makeupRequests?: AttendanceMakeupRequest[];
      makeupTodayGate?: MakeupTodayGate;
      onApply: () => void;
    }
  | {
      row: AttendancePunchDayRow;
      type: MakeupOutType;
      time: string | null;
      adminDirect?: false;
      makeupRequests?: AttendanceMakeupRequest[];
      makeupTodayGate?: MakeupTodayGate;
      onApply: () => void;
    };

export function AttendanceOutCell(props: AttendanceOutCellProps) {
  const { row, time, makeupRequests = [], makeupTodayGate, onApply } = props;

  if (time) return <span>{time}</span>;

  let slotState: "apply" | "pending" | null;
  if (props.adminDirect) {
    slotState = adminMakeupSlotStateWithPending(
      row,
      props.type,
      makeupRequests,
      makeupTodayGate,
    );
  } else {
    slotState = makeupSlotState(row, props.type, makeupRequests, makeupTodayGate);
  }

  if (slotState === "pending") {
    return (
      <div className="flex w-full justify-center">
        <span className={cn("text-sm", attendancePendingTextClass)}>审批中</span>
      </div>
    );
  }

  if (slotState === "apply") {
    return (
      <div className="flex w-full justify-center">
        <Button
          type="button"
          variant="secondary"
          onClick={onApply}
        >
          补卡
        </Button>
      </div>
    );
  }

  return null;
}
