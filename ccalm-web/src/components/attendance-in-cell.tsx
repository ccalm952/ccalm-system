import { Button } from "@/components/ui/button";
import { inTypeForHalf, makeupInSlotState, type MakeupInType } from "@/lib/attendance/makeup";
import { canDeclareRest, isHalfEffectivelyAtRest, type RestHalf } from "@/lib/attendance/rest";
import type { AttendanceMakeupRequest, AttendancePunchDayRow } from "@/lib/attendance/types";

const actionLinkClass = "h-auto px-0 text-sm font-normal underline-offset-2 hover:underline";

export function AttendanceInCell(props: {
  row: AttendancePunchDayRow;
  half: RestHalf;
  time: string | null;
  makeupRequests?: AttendanceMakeupRequest[];
  onDeclare: () => void;
  onClear: () => void;
  onMakeup: (type: MakeupInType) => void;
}) {
  const { row, half, time, makeupRequests = [], onDeclare, onClear, onMakeup } = props;

  if (time) return <span>{time}</span>;

  if (isHalfEffectivelyAtRest(row, half)) {
    return (
      <Button
        type="button"
        variant="link"
        className={`${actionLinkClass} text-muted-foreground`}
        onClick={onClear}
      >
        休息
      </Button>
    );
  }

  const inType = inTypeForHalf(half);
  const makeupState = makeupInSlotState(row, inType, makeupRequests);
  const showRest = canDeclareRest(row, half);

  if (!showRest && !makeupState) return null;

  if (makeupState === "pending" && !showRest) {
    return <span className="text-sm text-muted-foreground">审批中</span>;
  }

  return (
    <span className="inline-flex items-center justify-center text-sm">
      {showRest ? (
        <Button
          type="button"
          variant="link"
          className={`${actionLinkClass} text-muted-foreground`}
          onClick={onDeclare}
        >
          休息
        </Button>
      ) : null}
      {showRest && makeupState ? <span className="text-muted-foreground">/</span> : null}
      {makeupState === "pending" ? <span className="text-muted-foreground">审批中</span> : null}
      {makeupState === "apply" ? (
        <Button
          type="button"
          variant="link"
          className={`${actionLinkClass} text-pink-500`}
          onClick={() => onMakeup(inType)}
        >
          补卡
        </Button>
      ) : null}
    </span>
  );
}
