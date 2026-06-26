import { AttendanceOutCell } from "@/components/attendance-out-cell";
import { isHalfEffectivelyAtRest, type RestHalf } from "@/lib/attendance/rest";
import type { MakeupOutType } from "@/lib/attendance/makeup";
import type { AttendanceMakeupRequest, AttendancePunchDayRow } from "@/lib/attendance/types";

export function AttendanceHalfOutCell(props: {
  row: AttendancePunchDayRow;
  half: RestHalf;
  type: MakeupOutType;
  time: string | null;
  makeupRequests?: AttendanceMakeupRequest[];
  adminDirect?: boolean;
  onApply: () => void;
}) {
  const { row, half, type, time, makeupRequests = [], adminDirect, onApply } = props;

  if (isHalfEffectivelyAtRest(row, half)) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (adminDirect) {
    return (
      <AttendanceOutCell
        row={row}
        type={type}
        time={time}
        adminDirect
        makeupRequests={makeupRequests}
        onApply={onApply}
      />
    );
  }

  return (
    <AttendanceOutCell
      row={row}
      type={type}
      time={time}
      makeupRequests={makeupRequests}
      onApply={onApply}
    />
  );
}
