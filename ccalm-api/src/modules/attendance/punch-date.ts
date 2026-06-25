import dayjs from "dayjs"

export function punchDateFromTime(date: Date): string {
  return dayjs(date).format("YYYY-MM-DD")
}
