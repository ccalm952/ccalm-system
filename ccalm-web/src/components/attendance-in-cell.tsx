import { Button } from "@/components/ui/button";
import {
  attendanceMutedTextClass,
  attendancePendingTextClass,
  tableActionLinkClass,
} from "@/lib/attendance/attendance-theme";
import {
  inTypeForHalf,
  makeupInSlotState,
  type MakeupInType,
  type MakeupTodayGate,
} from "@/lib/attendance/makeup";
import { canClearRest, canDeclareRest, type RestHalf } from "@/lib/attendance/rest";
import type { AttendanceMakeupRequest, AttendancePunchDayRow } from "@/lib/attendance/types";
import { cn } from "@/lib/utils";

const actionLinkClass = tableActionLinkClass;

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
      <Button
        type="button"
        variant="link"
        className={actionLinkClass}
        onClick={onClear}
      >
        休息
      </Button>
    );
  }

  const inType = inTypeForHalf(half);
  const makeupState = makeupInSlotState(row, inType, makeupRequests, makeupTodayGate);
  const showRest = canDeclareRest(row, half);

  if (!showRest && !makeupState) return null;

  if (makeupState === "pending" && !showRest) {
    return <span className={cn("text-sm", attendancePendingTextClass)}>审批中</span>;
  }

  return (
    <span className="inline-flex items-center justify-center text-sm">
      {showRest ? (
        <Button
          type="button"
          variant="link"
          className={actionLinkClass}
          onClick={onDeclare}
        >
          休息
        </Button>
      ) : null}
      {showRest && makeupState ? <span className={attendanceMutedTextClass}>/</span> : null}
      {makeupState === "pending" ? (
        <span className={attendancePendingTextClass}>审批中</span>
      ) : null}
      {makeupState === "apply" ? (
        <Button
          type="button"
          variant="link"
          className={actionLinkClass}
          onClick={() => onMakeup(inType)}
        >
          补卡
        </Button>
      ) : null}
    </span>
  );
}
