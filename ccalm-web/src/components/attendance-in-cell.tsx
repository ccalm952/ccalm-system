import { Button } from "@/components/ui/button";
import {
  inTypeForHalf,
  makeupInSlotState,
  type MakeupInType,
} from "@/lib/attendance/makeup";
import {
  canDeclareRest,
  isHalfScheduleRest,
  type RestHalf,
} from "@/lib/attendance/rest";
import type { AttendanceMakeupRequest, AttendancePunchDayRow } from "@/lib/attendance/types";

export function AttendanceInCell(props: {
  row: AttendancePunchDayRow;
  half: RestHalf;
  time: string | null;
  makeupRequests?: AttendanceMakeupRequest[];
  onDeclare: () => void;
  onClear: () => void;
  onMakeup: (type: MakeupInType) => void;
}) {
  const {
    row,
    half,
    time,
    makeupRequests = [],
    onDeclare,
    onClear,
    onMakeup,
  } = props;

  if (time) return <span>{time}</span>;

  if (isHalfScheduleRest(row.scheduleRest, half)) {
    return (
      <Button
        type="button"
        variant="link"
        className="h-auto px-0 text-sm text-muted-foreground"
        onClick={onClear}
      >
        休
      </Button>
    );
  }

  const inType = inTypeForHalf(half);
  const makeupState = makeupInSlotState(row, inType, makeupRequests);
  const showRest = canDeclareRest(row, half);

  if (!showRest && !makeupState) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5">
      {showRest ? (
        <Button
          type="button"
          variant="link"
          className="h-auto px-0 text-sm text-muted-foreground"
          onClick={onDeclare}
        >
          休息
        </Button>
      ) : null}
      {showRest && makeupState ? (
        <span className="text-xs text-muted-foreground">·</span>
      ) : null}
      {makeupState === "pending" ? (
        <span className="text-sm text-muted-foreground">审批中</span>
      ) : null}
      {makeupState === "apply" ? (
        <Button
          type="button"
          variant="link"
          className="h-auto px-0 text-sm text-pink-500"
          onClick={() => onMakeup(inType)}
        >
          补卡
        </Button>
      ) : null}
    </div>
  );
}
