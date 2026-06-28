import { BadRequestException, Injectable } from "@nestjs/common"
import type { AttendancePunchType } from "@prisma/client"
import dayjs from "dayjs"

import { isWithinAttendanceEditWindow } from "./attendance-edit-window"
import { attendanceDayjs } from "./attendance-dayjs"
import {
  leaveDaysForShift,
  type ScheduleShiftType,
} from "./schedule-inference"

import { PrismaService } from "../../prisma/prisma.service"
import type { UpsertScheduleMonthConfigDto } from "./dto/schedule.dto"

const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"] as const

function monthBounds(month: string) {
  const base = attendanceDayjs(`${month}-01`, "YYYY-MM-DD")
  if (!base.isValid()) throw new BadRequestException("月份格式不合法")
  assertScheduleMonthAllowed(month)
  const start = base.startOf("month")
  const end = base.endOf("month")
  return { start, end, daysInMonth: end.date() }
}

function assertScheduleMonthAllowed(month: string) {
  const now = attendanceDayjs()
  const minMonth = now.subtract(1, "year").startOf("year").format("YYYY-MM")
  const maxMonth = now.endOf("year").format("YYYY-MM")
  if (month < minMonth || month > maxMonth) {
    throw new BadRequestException("仅支持查看去年与今年的排班")
  }
}

@Injectable()
export class AttendanceScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private async getMonthAllowance(month: string): Promise<number> {
    const row = await this.prisma.scheduleMonthConfig.findUnique({
      where: { month },
    })
    return row?.monthAllowance ?? 0
  }

  private async fetchDeclaredMap(
    userIds: string[],
    rangeStart: dayjs.Dayjs,
    rangeEnd: dayjs.Dayjs
  ): Promise<Map<string, ScheduleShiftType>> {
    const entries = await this.prisma.scheduleEntry.findMany({
      where: {
        userId: { in: userIds },
        isManual: true,
        date: {
          gte: rangeStart.format("YYYY-MM-DD"),
          lte: rangeEnd.format("YYYY-MM-DD"),
        },
      },
      select: { userId: true, date: true, shiftType: true },
    })
    return new Map(
      entries.map((e) => [`${e.userId}:${e.date}`, e.shiftType] as const)
    )
  }

  private accumulateLeaveForMonth(
    userIds: string[],
    monthStart: dayjs.Dayjs,
    monthEnd: dayjs.Dayjs,
    declaredMap: Map<string, ScheduleShiftType>,
    leaveByUserMonth: Map<string, number>
  ) {
    for (const userId of userIds) {
      for (
        let d = monthStart.startOf("day");
        !d.isAfter(monthEnd, "day");
        d = d.add(1, "day")
      ) {
        const date = d.format("YYYY-MM-DD")
        const key = `${userId}:${date}`
        const shift = declaredMap.get(key)
        if (!shift) continue
        const monthKey = `${userId}:${date.slice(0, 7)}`
        leaveByUserMonth.set(
          monthKey,
          (leaveByUserMonth.get(monthKey) ?? 0) + leaveDaysForShift(shift)
        )
      }
    }
  }

  private async computeLeaveByUserMonth(
    userIds: string[],
    rangeStart: dayjs.Dayjs,
    rangeEnd: dayjs.Dayjs,
    declaredMap: Map<string, ScheduleShiftType>
  ): Promise<Map<string, number>> {
    const leaveByUserMonth = new Map<string, number>()
    let monthCursor = rangeStart.startOf("month")
    const endMonth = rangeEnd.startOf("month")

    while (!monthCursor.isAfter(endMonth, "month")) {
      const monthStart = monthCursor.startOf("month")
      const monthEnd = monthCursor.endOf("month")
      this.accumulateLeaveForMonth(
        userIds,
        monthStart,
        monthEnd,
        declaredMap,
        leaveByUserMonth
      )
      monthCursor = monthCursor.add(1, "month")
    }

    return leaveByUserMonth
  }

  private remainingLeaveFromPrefetch(
    userId: string,
    month: string,
    initialBalance: number,
    createdAt: Date,
    configMap: Map<string, number>,
    leaveByUserMonth: Map<string, number>
  ): number {
    let balance = initialBalance
    let cursor = attendanceDayjs(createdAt).startOf("month")
    const target = attendanceDayjs(`${month}-01`, "YYYY-MM-DD")

    while (cursor.isBefore(target, "month")) {
      const m = cursor.format("YYYY-MM")
      balance += configMap.get(m) ?? 0
      balance -= leaveByUserMonth.get(`${userId}:${m}`) ?? 0
      cursor = cursor.add(1, "month")
    }

    const allowance = configMap.get(month) ?? 0
    const leave = leaveByUserMonth.get(`${userId}:${month}`) ?? 0
    return balance + allowance - leave
  }

  private async buildLeaveContext(
    userIds: string[],
    targetMonth: string,
    usersMeta: Array<{ id: string; createdAt: Date }>
  ) {
    const { end } = monthBounds(targetMonth)

    const earliestMonth = usersMeta.reduce((min, u) => {
      const m = attendanceDayjs(u.createdAt).startOf("month").format("YYYY-MM")
      return m < min ? m : min
    }, targetMonth)

    const historyStart = attendanceDayjs(`${earliestMonth}-01`, "YYYY-MM-DD")
    const declaredMap = await this.fetchDeclaredMap(userIds, historyStart, end)

    const monthKeys: string[] = []
    let monthCursor = historyStart
    const target = attendanceDayjs(`${targetMonth}-01`, "YYYY-MM-DD")
    while (!monthCursor.isAfter(target, "month")) {
      monthKeys.push(monthCursor.format("YYYY-MM"))
      monthCursor = monthCursor.add(1, "month")
    }

    const configs = await this.prisma.scheduleMonthConfig.findMany({
      where: { month: { in: monthKeys } },
    })
    const configMap = new Map(
      configs.map((c) => [c.month, c.monthAllowance] as const)
    )

    const leaveByUserMonth = await this.computeLeaveByUserMonth(
      userIds,
      historyStart,
      end,
      declaredMap
    )

    return { configMap, leaveByUserMonth, declaredMap }
  }

  async getMonth(month: string) {
    const { start, end, daysInMonth } = monthBounds(month)
    const monthAllowance = await this.getMonthAllowance(month)

    const users = await this.prisma.user.findMany({
      where: { role: "user" },
      orderBy: [{ displayName: "asc" }, { username: "asc" }],
      select: {
        id: true,
        displayName: true,
        username: true,
        leaveInitialBalance: true,
        createdAt: true,
      },
    })

    const userIds = users.map((u) => u.id)
    const { configMap, leaveByUserMonth, declaredMap } =
      await this.buildLeaveContext(userIds, month, users)

    const userRows = users.map((u) => {
      const days: Record<string, ScheduleShiftType | null> = {}
      let fullCount = 0
      let morningCount = 0
      let afternoonCount = 0

      for (let d = 1; d <= daysInMonth; d += 1) {
        const date = start.date(d).format("YYYY-MM-DD")
        const key = `${u.id}:${date}`
        const shift = declaredMap.get(key) ?? null
        days[String(d)] = shift
        if (shift === "full_rest") fullCount += 1
        if (shift === "morning_rest") morningCount += 1
        if (shift === "afternoon_rest") afternoonCount += 1
      }

      const monthLeave = fullCount + morningCount * 0.5 + afternoonCount * 0.5
      const remainingLeave = this.remainingLeaveFromPrefetch(
        u.id,
        month,
        u.leaveInitialBalance,
        u.createdAt,
        configMap,
        leaveByUserMonth
      )

      return {
        userId: u.id,
        userName: u.displayName || u.username,
        days,
        fullCount,
        morningCount,
        afternoonCount,
        monthLeave,
        remainingLeave,
      }
    })

    const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
      const d = start.date(i + 1)
      return {
        day: i + 1,
        weekday: WEEKDAY_ZH[d.day()],
      }
    })

    return {
      month,
      monthAllowance,
      daysInMonth,
      dayHeaders,
      users: userRows,
    }
  }

  async upsertMonthConfig(dto: UpsertScheduleMonthConfigDto) {
    monthBounds(dto.month)
    const row = await this.prisma.scheduleMonthConfig.upsert({
      where: { month: dto.month },
      create: {
        month: dto.month,
        monthAllowance: dto.monthAllowance,
      },
      update: {
        monthAllowance: dto.monthAllowance,
      },
    })
    return {
      month: row.month,
      monthAllowance: row.monthAllowance,
    }
  }

  async getRemainingLeave(userId: string, month: string): Promise<number> {
    monthBounds(month)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { leaveInitialBalance: true, createdAt: true },
    })
    if (!user) throw new BadRequestException("用户不存在")

    const { configMap, leaveByUserMonth } = await this.buildLeaveContext(
      [userId],
      month,
      [{ id: userId, createdAt: user.createdAt }]
    )

    return this.remainingLeaveFromPrefetch(
      userId,
      month,
      user.leaveInitialBalance,
      user.createdAt,
      configMap,
      leaveByUserMonth
    )
  }

  async resolveShiftForUserDay(
    userId: string,
    dateStr: string
  ): Promise<ScheduleShiftType | null> {
    const entry = await this.prisma.scheduleEntry.findUnique({
      where: { userId_date: { userId, date: dateStr } },
      select: { shiftType: true, isManual: true },
    })
    return entry?.isManual ? entry.shiftType : null
  }

  async assertHalfOpenForPunch(
    userId: string,
    punchDate: string,
    type: AttendancePunchType
  ) {
    const entry = await this.prisma.scheduleEntry.findUnique({
      where: { userId_date: { userId, date: punchDate } },
      select: { shiftType: true, isManual: true },
    })
    if (!entry?.isManual) return

    const { shiftType } = entry
    if (
      (type === "morning_in" || type === "morning_out") &&
      (shiftType === "morning_rest" || shiftType === "full_rest")
    ) {
      throw new BadRequestException("上午已登记休息，请先取消休息登记后再打卡")
    }
    if (
      (type === "afternoon_in" || type === "afternoon_out") &&
      (shiftType === "afternoon_rest" || shiftType === "full_rest")
    ) {
      throw new BadRequestException("下午已登记休息，请先取消休息登记后再打卡")
    }
  }

  private assertRestDateAllowed(dateStr: string) {
    const d = attendanceDayjs(dateStr, "YYYY-MM-DD")
    if (!d.isValid()) throw new BadRequestException("日期不合法")
    if (!isWithinAttendanceEditWindow(dateStr)) {
      throw new BadRequestException("仅支持登记本月或上月的休息")
    }
  }

  private async dayPunchTypes(userId: string, dateStr: string) {
    const start = attendanceDayjs(dateStr, "YYYY-MM-DD").startOf("day").toDate()
    const end = attendanceDayjs(dateStr, "YYYY-MM-DD")
      .add(1, "day")
      .startOf("day")
      .toDate()
    const records = await this.prisma.attendanceRecord.findMany({
      where: { userId, punchTime: { gte: start, lt: end } },
      select: { type: true },
    })
    return new Set(records.map((r) => r.type))
  }

  private manualDeclaredShift(
    entry: { shiftType: ScheduleShiftType; isManual: boolean } | null
  ): ScheduleShiftType | null {
    return entry?.isManual ? entry.shiftType : null
  }

  private nextRestType(
    current: ScheduleShiftType | null,
    half: "morning" | "afternoon"
  ): ScheduleShiftType {
    if (half === "morning") {
      if (current === "afternoon_rest") return "full_rest"
      return "morning_rest"
    }
    if (current === "morning_rest") return "full_rest"
    return "afternoon_rest"
  }

  async declareRest(
    userId: string,
    date: string,
    half: "morning" | "afternoon"
  ) {
    this.assertRestDateAllowed(date)

    const punched = await this.dayPunchTypes(userId, date)
    if (
      half === "morning" &&
      (punched.has("morning_in") || punched.has("morning_out"))
    ) {
      throw new BadRequestException("上午已有打卡记录，无法登记休息")
    }
    if (
      half === "afternoon" &&
      (punched.has("afternoon_in") || punched.has("afternoon_out"))
    ) {
      throw new BadRequestException("下午已有打卡记录，无法登记休息")
    }

    const existing = await this.prisma.scheduleEntry.findUnique({
      where: { userId_date: { userId, date } },
    })
    const current = this.manualDeclaredShift(existing)

    if (
      half === "morning" &&
      (current === "morning_rest" || current === "full_rest")
    ) {
      throw new BadRequestException("上午已登记休息")
    }
    if (
      half === "afternoon" &&
      (current === "afternoon_rest" || current === "full_rest")
    ) {
      throw new BadRequestException("下午已登记休息")
    }

    const next = this.nextRestType(current, half)

    await this.prisma.scheduleEntry.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        shiftType: next,
        isManual: true,
      },
      update: {
        shiftType: next,
        isManual: true,
      },
    })

    return { date, shiftType: next }
  }

  async clearRestHalf(
    userId: string,
    date: string,
    half: "morning" | "afternoon"
  ) {
    this.assertRestDateAllowed(date)

    const existing = await this.prisma.scheduleEntry.findUnique({
      where: { userId_date: { userId, date } },
    })
    const current = this.manualDeclaredShift(existing)
    if (!current) {
      throw new BadRequestException("该日未登记休息")
    }

    let next: ScheduleShiftType | null

    if (half === "morning") {
      if (current === "morning_rest") next = null
      else if (current === "full_rest") next = "afternoon_rest"
      else throw new BadRequestException("上午未登记休息")
    } else if (current === "afternoon_rest") {
      next = null
    } else if (current === "full_rest") {
      next = "morning_rest"
    } else {
      throw new BadRequestException("下午未登记休息")
    }

    if (!next) {
      await this.prisma.scheduleEntry.delete({
        where: { userId_date: { userId, date } },
      })
      return { date, shiftType: null }
    }

    await this.prisma.scheduleEntry.update({
      where: { userId_date: { userId, date } },
      data: { shiftType: next, isManual: true },
    })
    return { date, shiftType: next }
  }

  async scheduleMapForUser(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Map<string, ScheduleShiftType>> {
    const maps = await this.scheduleMapsForUsers([userId], startDate, endDate)
    return maps.get(userId) ?? new Map()
  }

  async declaredScheduleMapForUser(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Map<string, ScheduleShiftType>> {
    const maps = await this.declaredScheduleMapsForUsers(
      [userId],
      startDate,
      endDate
    )
    return maps.get(userId) ?? new Map()
  }

  async declaredScheduleMapsForUsers(
    userIds: string[],
    startDate: string,
    endDate: string
  ): Promise<Map<string, Map<string, ScheduleShiftType>>> {
    const result = new Map<string, Map<string, ScheduleShiftType>>()
    for (const userId of userIds) result.set(userId, new Map())
    if (!userIds.length) return result

    const start = attendanceDayjs(startDate, "YYYY-MM-DD")
    const end = attendanceDayjs(endDate, "YYYY-MM-DD")
    if (!start.isValid() || !end.isValid() || end.isBefore(start, "day")) {
      throw new BadRequestException("日期范围不合法")
    }

    const declaredMap = await this.fetchDeclaredMap(userIds, start, end)
    for (const [key, shift] of declaredMap) {
      const sep = key.indexOf(":")
      if (sep < 0) continue
      const userId = key.slice(0, sep)
      const date = key.slice(sep + 1)
      const userMap = result.get(userId)
      if (userMap) userMap.set(date, shift)
    }
    return result
  }

  async scheduleMapsForUsers(
    userIds: string[],
    startDate: string,
    endDate: string
  ): Promise<Map<string, Map<string, ScheduleShiftType>>> {
    return this.declaredScheduleMapsForUsers(userIds, startDate, endDate)
  }
}
