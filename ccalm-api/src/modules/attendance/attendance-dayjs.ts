import dayjs from "dayjs"
import timezone from "dayjs/plugin/timezone"
import utc from "dayjs/plugin/utc"

export const APP_TIMEZONE = "Asia/Shanghai"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault(APP_TIMEZONE)

/** 业务时区下的当前时刻 */
export function attendanceNow() {
  return dayjs().tz(APP_TIMEZONE)
}

/** 业务时区下的今日 0 点 */
export function attendanceTodayStart() {
  return attendanceNow().startOf("day")
}

export function formatAttendanceDate(
  date: Date | string | dayjs.Dayjs
): string {
  return dayjs(date).tz(APP_TIMEZONE).format("YYYY-MM-DD")
}

export function formatAttendanceTime(
  date: Date | string | dayjs.Dayjs
): string {
  return dayjs(date).tz(APP_TIMEZONE).format("HH:mm")
}

export function attendanceDayjs(
  date?: dayjs.ConfigType,
  format?: dayjs.OptionType
) {
  return dayjs(date, format).tz(APP_TIMEZONE)
}
