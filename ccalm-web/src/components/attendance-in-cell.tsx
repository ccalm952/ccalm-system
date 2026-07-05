import { Button } from "@/components/ui/button";
import { attendancePendingTextClass } from "@/lib/attendance/attendance-theme";
import {
  inTypeForHalf,
  makeupInSlotState,
  type MakeupInType,
  type MakeupTodayGate,
} from "@/lib/attendance/makeup";
import { canClearRest, canDeclareRest, type RestHalf } from "@/lib/attendance/rest";
import type { AttendanceMakeupRequest, AttendancePunchDayRow } from "@/lib/attendance/types";
import { cn } from "@/lib/utils";

export function AttendanceInCell(props: {
  row: AttendancePunchDayRow;
  half: RestHalf;
  time: string | null;
  makeupRequests?: AttendanceMakeupRequest[];
  makeupTodayGate?: MakeupTodayGate;
  onDeclare: () => void;
  onClear: () => void;
  onMakeup: (type: MakeupInType) => void;
}) {
  const { row, half, time, makeupRequests = [], makeupTodayGate, onDeclare, onClear, onMakeup } =
    props;

  if (time) return <span>{time}</span>;

  if (canClearRest(row, half)) {
    return (
      <div className="flex w-full justify-center">
        <Button
          type="button"
          variant="secondary"
          onClick={onClear}
        >
          休息
        </Button>
      </div>
    );
  }

  const inType = inTypeForHalf(half);
  const makeupState = makeupInSlotState(row, inType, makeupRequests, makeupTodayGate);
  const showRest = canDeclareRest(row, half);

  if (!showRest && !makeupState) return null;

  if (makeupState === "pending" && !showRest) {
    return (
      <div className="flex w-full justify-center">
        <span className={cn("text-sm", attendancePendingTextClass)}>审批中</span>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center gap-2 text-sm">
      {showRest ? (
        <Button
          type="button"
          variant="secondary"
          onClick={onDeclare}
        >
          休息
        </Button>
      ) : null}
      {makeupState === "pending" ? (
        <span className={attendancePendingTextClass}>审批中</span>
      ) : null}
      {makeupState === "apply" ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => onMakeup(inType)}
        >
          补卡
        </Button>
      ) : null}
    </div>
  );
}
