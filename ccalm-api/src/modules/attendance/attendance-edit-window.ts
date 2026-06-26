import {
  buildEditWindowContext,
  isWithinAttendanceEditWindow as isWithinAttendanceEditWindowCore,
} from "@ccalm/attendance-core"

import { attendanceTodayStart } from "./attendance-dayjs"

/** 与考勤统计「本月 / 上个月」一致：仅允许编辑本月与上个自然月内的日期。 */
export function isWithinAttendanceEditWindow(dateStr: string): boolean {
  const today = attendanceTodayStart()
  return isWithinAttendanceEditWindowCore(
    dateStr,
    buildEditWindowContext(today.format("YYYY-MM-DD"))
  )
}
