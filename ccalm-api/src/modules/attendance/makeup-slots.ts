import {
  buildEditWindowContext,
  isWithinAttendanceEditWindow,
  type EditWindowContext,
} from "./edit-window"
import {
  formatAttendanceTime,
} from "./attendance-dayjs"
import {
  passesMakeupTodayGate,
  type MakeupSlotType,
  type MakeupTodayGate,
} from "./makeup-today-gate"
import {
  isPunchBlockedByScheduleRest,
  type DayPunchRow,
} from "./schedule-rest"
import type { ScheduleShiftType } from "./schedule-inference"

import { attendanceDayjs, attendanceTodayStart } from "./attendance-dayjs"
import { isAttendanceDateToday } from "./attendance-makeup-today-gate"

export type { DayPunchRow } from "./schedule-rest"

export type PendingMakeup = {
  date: string
  type: string
  status: string
}

export type MakeupSlotDenyReason =
  | "window"
  | "gate"
  | "rest"
  | "exists"
  | "need_in"
  | "pending"

type MakeupSlotsEnv = {
  editWindowContext: EditWindowContext
  isToday: (dateStr: string) => boolean
  wallMinutes: (at: Date) => number
}

const IN_TYPE_BY_OUT: Record<
  "morning_out" | "afternoon_out",
  "morning_in" | "afternoon_in"
> = {
  morning_out: "morning_in",
  afternoon_out: "afternoon_in",
}

function makeupSlotsEnv(at: Date = new Date()): MakeupSlotsEnv {
  const todayYmd = attendanceTodayStart().format("YYYY-MM-DD")
  return {
    editWindowContext: buildEditWindowContext(todayYmd),
    isToday: isAttendanceDateToday,
    wallMinutes: (d) =>
      attendanceDayjs(d).hour() * 60 + attendanceDayjs(d).minute(),
  }
}

export function buildDayPunchRow(
  dateStr: string,
  declaredRest: ScheduleShiftType | null | undefined,
  records: Iterable<{ type: string; punchTime: Date }>
): DayPunchRow {
  const row: DayPunchRow = {
    date: dateStr,
    morningIn: null,
    morningOut: null,
    afternoonIn: null,
    afternoonOut: null,
    declaredRest: declaredRest ?? null,
  }
  for (const r of records) {
    const hm = formatAttendanceTime(r.punchTime)
    if (r.type === "morning_in") row.morningIn = hm
    if (r.type === "morning_out") row.morningOut = hm
    if (r.type === "afternoon_in") row.afternoonIn = hm
    if (r.type === "afternoon_out") row.afternoonOut = hm
  }
  return row
}

function slotTime(row: DayPunchRow, type: MakeupSlotType): string | null {
  if (type === "morning_in") return row.morningIn
  if (type === "morning_out") return row.morningOut
  if (type === "afternoon_in") return row.afternoonIn
  return row.afternoonOut
}

function isWithinMakeupWindow(dateStr: string, env: MakeupSlotsEnv): boolean {
  return isWithinAttendanceEditWindow(dateStr, env.editWindowContext)
}

function passesGate(
  dateStr: string,
  type: MakeupSlotType,
  gate: MakeupTodayGate | undefined,
  at: Date,
  env: MakeupSlotsEnv
): boolean {
  return passesMakeupTodayGate(
    env.isToday(dateStr),
    env.wallMinutes(at),
    type,
    gate
  )
}

function hasPending(
  row: DayPunchRow,
  type: string,
  pending: PendingMakeup[]
): boolean {
  return pending.some(
    (r) => r.date === row.date && r.type === type && r.status === "pending"
  )
}

function employeeMakeupSlotDenyReason(
  row: DayPunchRow,
  type: MakeupSlotType,
  pending: PendingMakeup[],
  env: MakeupSlotsEnv,
  gate: MakeupTodayGate | undefined,
  at: Date
): MakeupSlotDenyReason | null {
  if (!isWithinMakeupWindow(row.date, env)) return "window"
  if (!passesGate(row.date, type, gate, at, env)) return "gate"
  if (isPunchBlockedByScheduleRest(type, row.declaredRest)) return "rest"
  if (type === "morning_in" || type === "afternoon_in") {
    if (slotTime(row, type)) return "exists"
  } else {
    const inType = IN_TYPE_BY_OUT[type]
    if (!slotTime(row, inType)) return "need_in"
    if (slotTime(row, type)) return "exists"
  }
  if (hasPending(row, type, pending)) return "pending"
  return null
}

function adminMakeupSlotDenyReason(
  row: DayPunchRow,
  type: MakeupSlotType,
  env: MakeupSlotsEnv,
  gate: MakeupTodayGate | undefined,
  at: Date
): MakeupSlotDenyReason | null {
  if (!isWithinMakeupWindow(row.date, env)) return "window"
  if (!passesGate(row.date, type, gate, at, env)) return "gate"
  if (isPunchBlockedByScheduleRest(type, row.declaredRest)) return "rest"
  if (type === "morning_in" || type === "afternoon_in") {
    if (slotTime(row, type)) return "exists"
  } else {
    const inType = IN_TYPE_BY_OUT[type]
    if (!slotTime(row, inType)) return "need_in"
    if (slotTime(row, type)) return "exists"
  }
  return null
}

export function employeeMakeupSlotAvailable(
  row: DayPunchRow,
  type: MakeupSlotType,
  pending: PendingMakeup[] = [],
  gate?: MakeupTodayGate,
  at: Date = new Date()
): boolean {
  const env = makeupSlotsEnv(at)
  return (
    employeeMakeupSlotDenyReason(row, type, pending, env, gate, at) === null
  )
}

export function adminMakeupSlotAvailable(
  row: DayPunchRow,
  type: MakeupSlotType,
  gate?: MakeupTodayGate,
  at: Date = new Date()
): boolean {
  const env = makeupSlotsEnv(at)
  return adminMakeupSlotDenyReason(row, type, env, gate, at) === null
}

export function makeupSlotDenyMessage(
  reason: MakeupSlotDenyReason,
  type: MakeupSlotType
): string {
  switch (reason) {
    case "window":
      return "仅支持补本月或上月的缺卡"
    case "gate": {
      const label =
        type === "morning_in" || type === "morning_out"
          ? "上午上班"
          : "下午上班"
      return `需等今日${label}打卡窗口结束后才能补卡`
    }
    case "rest":
      return "该半天已登记休息，无法补卡"
    case "exists":
      return type === "morning_in" || type === "afternoon_in"
        ? "该上班卡已存在，无需补卡"
        : "该下班卡已存在，无需补卡"
    case "need_in":
      return type === "morning_out"
        ? "需先补上午上班，才能补上午下班"
        : "需先补下午上班，才能补下午下班"
    case "pending":
      return "该缺卡已有审批中的补卡申请"
  }
}

function employeeMakeupSlotState(
  row: DayPunchRow,
  type: MakeupSlotType,
  pending: PendingMakeup[],
  env: MakeupSlotsEnv,
  gate: MakeupTodayGate | undefined,
  at: Date = new Date()
): "apply" | null {
  if (employeeMakeupSlotDenyReason(row, type, pending, env, gate, at) !== null) {
    return null
  }
  return "apply"
}

/** 与打卡页一致：每个可点击的「补/补卡」按钮计 1 次缺卡（审批中不计）。 */
export function countMakeupButtonSlots(
  row: DayPunchRow,
  pending: PendingMakeup[] = [],
  gate?: MakeupTodayGate,
  at: Date = new Date()
): number {
  const env = makeupSlotsEnv(at)
  let count = 0
  for (const type of [
    "morning_in",
    "afternoon_in",
    "morning_out",
    "afternoon_out",
  ] as const) {
    if (
      employeeMakeupSlotState(row, type, pending, env, gate, at) === "apply"
    ) {
      count += 1
    }
  }
  return count
}

/** 按半天统计出勤：有上班卡 +0.5 出勤。 */
export function applyDayAttendance(row: DayPunchRow): number {
  let attendanceDays = 0
  if (row.morningIn) attendanceDays += 0.5
  if (row.afternoonIn) attendanceDays += 0.5
  return attendanceDays
}

export {
  employeeMakeupSlotDenyReason,
  adminMakeupSlotDenyReason,
  makeupSlotsEnv,
}
