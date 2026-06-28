import type { Dayjs } from "dayjs"

import {
  attendanceDayjs,
  attendanceTodayStart,
  formatAttendanceDate,
  formatAttendanceTime,
} from "./attendance-dayjs"
import { countMakeupButtonSlots, applyDayAttendance } from "./makeup-slots"
import { effectiveLeaveDaysForDay } from "./schedule-inference"
import { minutesFromMidnight } from "./time"

export type MonthlySummaryRow = {
  date: string
  morningIn: string | null
  morningOut: string | null
  afternoonIn: string | null
  afternoonOut: string | null
  morningOutIsMakeup: boolean
  afternoonOutIsMakeup: boolean
  scheduleRest: "full_rest" | "morning_rest" | "afternoon_rest" | null
  declaredRest: "full_rest" | "morning_rest" | "afternoon_rest" | null
  overtimeMinutes: number
  overtimeStr: string
}

type PunchRecord = {
  punchTime: Date
  type: string
  source: string
}

type PendingMakeup = {
  date: string
  type: string
  status: string
}

type ShiftGate = {
  morningInWindowEnd: string
  afternoonInWindowEnd: string
  overtimeMorningNormalEnd: string
  overtimeAfternoonNormalEnd: string
}

export function fmtOvertimeMinutes(m: number): string {
  if (m <= 0) return "-"
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (h <= 0) return `${mm}分钟`
  if (mm <= 0) return `${h}小时`
  return `${h}小时${mm}分钟`
}

export function computeMonthlySummaryAggregate(params: {
  start: Dayjs
  end: Dayjs
  todayYmd: string
  declaredScheduleMap: Map<
    string,
    "full_rest" | "morning_rest" | "afternoon_rest"
  >
  records: PunchRecord[]
  shift: ShiftGate
  pendingMakeups: PendingMakeup[]
}): {
  attendanceDays: number
  restDays: number
  missingSlots: number
  overtimeMinutes: number
  overtimeStr: string
  rows: MonthlySummaryRow[]
} {
  const {
    start,
    end,
    todayYmd,
    declaredScheduleMap,
    records,
    shift,
    pendingMakeups,
  } = params

  const byDate = new Map<string, PunchRecord[]>()
  for (const r of records) {
    const key = formatAttendanceDate(r.punchTime)
    const arr = byDate.get(key) ?? []
    arr.push(r)
    byDate.set(key, arr)
  }

  const normalMorningEnd = minutesFromMidnight(shift.overtimeMorningNormalEnd)
  const normalAfternoonEnd = minutesFromMidnight(
    shift.overtimeAfternoonNormalEnd
  )
  const gate = {
    morningInWindowEnd: shift.morningInWindowEnd,
    afternoonInWindowEnd: shift.afternoonInWindowEnd,
  }

  let attendanceDays = 0
  let restDays = 0
  let missingSlots = 0
  let overtimeMinutes = 0
  const rows: MonthlySummaryRow[] = []

  for (
    let d = end;
    d.isAfter(start, "day") || d.isSame(start, "day");
    d = d.subtract(1, "day")
  ) {
    const ymd = d.format("YYYY-MM-DD")
    const declaredRest = declaredScheduleMap.get(ymd) ?? null
    const dayRecords = (byDate.get(ymd) ?? []).slice()
    const row: MonthlySummaryRow = {
      date: ymd,
      morningIn: null,
      morningOut: null,
      afternoonIn: null,
      afternoonOut: null,
      morningOutIsMakeup: false,
      afternoonOutIsMakeup: false,
      scheduleRest: declaredRest,
      declaredRest,
      overtimeMinutes: 0,
      overtimeStr: "-",
    }

    for (const r of dayRecords) {
      const hm = formatAttendanceTime(r.punchTime)
      if (r.type === "morning_in" && !row.morningIn) row.morningIn = hm
      if (r.type === "morning_out") {
        row.morningOut = hm
        row.morningOutIsMakeup = r.source === "makeup"
      }
      if (r.type === "afternoon_in" && !row.afternoonIn) row.afternoonIn = hm
      if (r.type === "afternoon_out") {
        row.afternoonOut = hm
        row.afternoonOutIsMakeup = r.source === "makeup"
      }
    }

    const hasAny = !!(
      row.morningIn ||
      row.morningOut ||
      row.afternoonIn ||
      row.afternoonOut
    )
    if (!hasAny && !declaredRest) {
      if (ymd === todayYmd) {
        rows.push(row)
        continue
      }
      missingSlots += countMakeupButtonSlots(row, pendingMakeups, gate)
      rows.push(row)
      continue
    }

    restDays += effectiveLeaveDaysForDay(
      declaredRest,
      !!(row.morningIn || row.morningOut),
      !!(row.afternoonIn || row.afternoonOut)
    )
    attendanceDays += applyDayAttendance(row)

    missingSlots += countMakeupButtonSlots(row, pendingMakeups, gate)

    let overtime = 0
    if (row.morningOut && Number.isFinite(normalMorningEnd)) {
      overtime += Math.max(
        0,
        minutesFromMidnight(row.morningOut) - normalMorningEnd
      )
    }
    if (row.afternoonOut && Number.isFinite(normalAfternoonEnd)) {
      overtime += Math.max(
        0,
        minutesFromMidnight(row.afternoonOut) - normalAfternoonEnd
      )
    }
    row.overtimeMinutes = overtime
    row.overtimeStr = fmtOvertimeMinutes(overtime)
    overtimeMinutes += overtime

    rows.push(row)
  }

  return {
    attendanceDays,
    restDays,
    missingSlots,
    overtimeMinutes,
    overtimeStr: fmtOvertimeMinutes(overtimeMinutes),
    rows,
  }
}

export function monthSummaryBounds(month: string) {
  const base = attendanceDayjs(`${month}-01`, "YYYY-MM-DD")
  if (!base.isValid()) return null
  const start = base.startOf("month")
  const today = attendanceTodayStart()
  const end = base.isSame(today, "month") ? today : base.endOf("month")
  return {
    start,
    end,
    todayYmd: today.format("YYYY-MM-DD"),
    startDate: start.format("YYYY-MM-DD"),
    rangeEnd: end.format("YYYY-MM-DD"),
    rangeEndExclusive: end.add(1, "day").startOf("day").toDate(),
    rangeStart: start.toDate(),
  }
}
