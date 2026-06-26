import { AttendanceOutCell } from "@/components/attendance-out-cell";
import { attendanceMutedTextClass } from "@/lib/attendance/attendance-theme";
import { isHalfEffectivelyAtRest, type RestHalf } from "@/lib/attendance/rest";
import type { MakeupOutType, MakeupTodayGate } from "@/lib/attendance/makeup";
import type { AttendanceMakeupRequest, AttendancePunchDayRow } from "@/lib/attendance/types";

export function AttendanceHalfOutCell(props: {
  row: AttendancePunchDayRow;
  half: RestHalf;
  type: MakeupOutType;
  time: string | null;
  makeupRequests?: AttendanceMakeupRequest[];
  makeupTodayGate?: MakeupTodayGate;
  adminDirect?: boolean;
  onApply: () => void;
}) {
  const {
    row,
    half,
    type,
    time,
    makeupRequests = [],
    makeupTodayGate,
    adminDirect,
    onApply,
  } = props;

  if (isHalfEffectivelyAtRest(row, half)) {
    return <span className={attendanceMutedTextClass}>—</span>;
  }

  if (adminDirect) {
    return (
      <AttendanceOutCell
        row={row}
        type={type}
        time={time}
        adminDirect
        makeupRequests={makeupRequests}
        makeupTodayGate={makeupTodayGate}
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
      makeupTodayGate={makeupTodayGate}
      onApply={onApply}
    />
  );
}
