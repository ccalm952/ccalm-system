import type { Dayjs } from "dayjs"

import { attendanceDayjs } from "./attendance-dayjs"

export function shouldAutoMakeupOut(
  now: Dayjs,
  dateStr: string,
  outWindowEndHhmm: string
): boolean {
  const windowEnd = attendanceDayjs(
    `${dateStr} ${outWindowEndHhmm}`,
    "YYYY-MM-DD HH:mm"
  )
  if (!windowEnd.isValid()) return false
  return now.isAfter(windowEnd)
}
