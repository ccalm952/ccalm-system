import { formatAttendanceDate } from "./attendance-dayjs"

export function punchDateFromTime(date: Date): string {
  return formatAttendanceDate(date)
}
