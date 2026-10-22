import {
  buildEditWindowContext,
  isWithinAttendanceEditWindow as isWithinEditWindow,
} from "./edit-window";

import { attendanceTodayStart } from "./attendance-dayjs";

/** 默认限本月/上月；传入最早记录月时，允许该月至今。 */
export function isWithinAttendanceEditWindow(
  dateStr: string,
  earliestMonth?: string,
): boolean {
  const today = attendanceTodayStart();
  return isWithinEditWindow(
    dateStr,
    buildEditWindowContext(today.format("YYYY-MM-DD")),
    earliestMonth,
  );
}
