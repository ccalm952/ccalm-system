import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

export const APP_TIMEZONE = "Asia/Shanghai";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault(APP_TIMEZONE);

export function attendanceNow() {
  return dayjs().tz(APP_TIMEZONE);
}

export function attendanceTodayStart() {
  return attendanceNow().startOf("day");
}

export function attendanceDayjs(
  date?: dayjs.ConfigType,
  format?: dayjs.OptionType,
) {
  return dayjs(date, format).tz(APP_TIMEZONE);
}
