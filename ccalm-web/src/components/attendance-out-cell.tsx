import { Button } from "@/components/ui/button";
import { adminMakeupSlotState, makeupSlotState, type AdminMakeupType, type MakeupOutType } from "@/lib/attendance/makeup";
import type { AttendanceMakeupRequest, AttendancePunchDayRow } from "@/lib/attendance/types";

export function AttendanceOutCell(props: {
  row: AttendancePunchDayRow;
  type: MakeupOutType | AdminMakeupType;
  time: string | null;
  makeupRequests?: AttendanceMakeupRequest[];
  adminDirect?: boolean;
  onApply: () => void;
}) {
  const { row, type, time, makeupRequests = [], adminDirect = false, onApply } = props;

  if (time) return <span>{time}</span>;

  const slotState = adminDirect
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
