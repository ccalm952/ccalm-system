import { Button } from "@/components/ui/button";
import { adminMakeupSlotState, makeupSlotState, type AdminMakeupType, type MakeupOutType } from "@/lib/attendance/makeup";
import type { AttendanceMakeupRequest, AttendancePunchDayRow } from "@/lib/attendance/types";

type AttendanceOutCellProps =
  | {
      row: AttendancePunchDayRow;
      type: AdminMakeupType;
      time: string | null;
      adminDirect: true;
      makeupRequests?: AttendanceMakeupRequest[];
      onApply: () => void;
    }
  | {
      row: AttendancePunchDayRow;
      type: MakeupOutType;
      time: string | null;
      adminDirect?: false;
      makeupRequests?: AttendanceMakeupRequest[];
      onApply: () => void;
    };

export function AttendanceOutCell(props: AttendanceOutCellProps) {
  const { row, type, time, makeupRequests = [], onApply } = props;

  if (time) return <span>{time}</span>;

  const slotState = props.adminDirect
    ? adminMakeupSlotState(row, type)
    : makeupSlotState(row, type, makeupRequests);

  if (slotState === "pending") {
    return <span className="text-sm text-muted-foreground">审批中</span>;
  }

  if (slotState === "apply") {
    return (
      <Button type="button" variant="link" className="h-auto px-0 text-sm" onClick={onApply}>
        补卡
      </Button>
    );
  }

  return null;
}
