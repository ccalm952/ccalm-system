import { Button } from "@/components/ui/button";
import {
  canDeclareRest,
  isHalfScheduleRest,
  type RestHalf,
} from "@/lib/attendance/rest";
import type { AttendancePunchDayRow } from "@/lib/attendance/types";

export function AttendanceInCell(props: {
  row: AttendancePunchDayRow;
  half: RestHalf;
  time: string | null;
  onDeclare: () => void;
  onClear: () => void;
}) {
  const { row, half, time, onDeclare, onClear } = props;

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

  if (canDeclareRest(row, half)) {
    return (
      <Button
        type="button"
        variant="link"
        className="h-auto px-0 text-sm text-muted-foreground"
        onClick={onDeclare}
      >
        休息
      </Button>
    );
  }

  return null;
}
