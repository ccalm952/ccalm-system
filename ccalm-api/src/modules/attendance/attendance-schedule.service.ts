import { BadRequestException, Injectable } from "@nestjs/common"
import dayjs from "dayjs"

import { PrismaService } from "../../prisma/prisma.service"
import type {
  ScheduleEntryChangeDto,
  UpsertScheduleMonthConfigDto,
} from "./dto/schedule.dto"

type ScheduleShiftType = "full_rest" | "morning_rest" | "afternoon_rest"

const WEEKDAY_ZH = ["日", "一", "二", "三", "四", "五", "六"] as const

function leaveDaysForShift(type: ScheduleShiftType | null | undefined): number {
  if (!type) return 0
  if (type === "full_rest") return 1
  return 0.5
}

function monthBounds(month: string) {
  const base = dayjs(`${month}-01`, "YYYY-MM-DD", true)
  if (!base.isValid()) throw new BadRequestException("月份格式不合法")
  assertScheduleMonthAllowed(month)
  const start = base.startOf("month")
  const end = base.endOf("month")
  return { start, end, daysInMonth: end.date() }
}

function assertScheduleMonthAllowed(month: string) {
  const now = dayjs()
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

  private async countUserMonthLeave(
    userId: string,
    month: string
  ): Promise<number> {
    const { start, end } = monthBounds(month)
    const entries = await this.prisma.scheduleEntry.findMany({
      where: {
        userId,
        date: {
          gte: start.format("YYYY-MM-DD"),
          lte: end.format("YYYY-MM-DD"),
        },
      },
    })
    return entries.reduce((sum, e) => sum + leaveDaysForShift(e.shiftType), 0)
  }

  private async balanceBeforeMonth(
    userId: string,
    month: string,
    initialBalance: number,
    createdAt: Date
  ): Promise<number> {
    const target = dayjs(`${month}-01`, "YYYY-MM-DD")
    let cursor = dayjs(createdAt).startOf("month")
    let balance = initialBalance

    while (cursor.isBefore(target, "month")) {
      const m = cursor.format("YYYY-MM")
      const allowance = await this.getMonthAllowance(m)
      const leave = await this.countUserMonthLeave(userId, m)
      balance = balance + allowance - leave
      cursor = cursor.add(1, "month")
    }

    return balance
  }

  private async remainingLeaveForMonth(
    userId: string,
    month: string,
    initialBalance: number,
    createdAt: Date
  ): Promise<number> {
    const before = await this.balanceBeforeMonth(
      userId,
      month,
      initialBalance,
      createdAt
    )
    const allowance = await this.getMonthAllowance(month)
    const leave = await this.countUserMonthLeave(userId, month)
    return before + allowance - leave
  }

  private dayRecordMap(
    records: Array<{ type: string; punchTime: Date }>
  ): Map<string, boolean> {
    const map = new Map<string, boolean>()
    for (const r of records) {
      map.set(r.type, true)
    }
    return map
  }

  private inferShiftFromPunches(
    records: Array<{ type: string; punchTime: Date }>
  ): ScheduleShiftType | null {
    const map = this.dayRecordMap(records)
    const hasMorningIn = map.has("morning_in")
    const hasAfternoonIn = map.has("afternoon_in")
    const hasAny =
      hasMorningIn ||
      map.has("morning_out") ||
      hasAfternoonIn ||
      map.has("afternoon_out")

    if (!hasAny) return "full_rest"
    if (hasMorningIn && hasAfternoonIn) return null
    if (hasMorningIn && !hasAfternoonIn) return "afternoon_rest"
    if (!hasMorningIn && hasAfternoonIn) return "morning_rest"
    return null
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

    const entries = await this.prisma.scheduleEntry.findMany({
      where: {
        date: {
          gte: start.format("YYYY-MM-DD"),
          lte: end.format("YYYY-MM-DD"),
        },
      },
    })

    const entryMap = new Map<string, ScheduleShiftType>()
    for (const e of entries) {
      entryMap.set(`${e.userId}:${e.date}`, e.shiftType)
    }

    const userRows = await Promise.all(
      users.map(async (u) => {
        const days: Record<string, ScheduleShiftType | null> = {}
        let fullCount = 0
        let morningCount = 0
        let afternoonCount = 0

        for (let d = 1; d <= daysInMonth; d += 1) {
          const date = start.date(d).format("YYYY-MM-DD")
          const key = `${u.id}:${date}`
          const shift = entryMap.get(key) ?? null
          days[String(d)] = shift
          if (shift === "full_rest") fullCount += 1
          if (shift === "morning_rest") morningCount += 1
          if (shift === "afternoon_rest") afternoonCount += 1
        }

        const monthLeave = fullCount + morningCount * 0.5 + afternoonCount * 0.5
        const remainingLeave = await this.remainingLeaveForMonth(
          u.id,
          month,
          u.leaveInitialBalance,
          u.createdAt
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
    )

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

  async upsertEntries(month: string, entries: ScheduleEntryChangeDto[]) {
    const { start, end } = monthBounds(month)

    for (const item of entries) {
      const d = dayjs(item.date, "YYYY-MM-DD", true)
      if (!d.isValid() || d.format("YYYY-MM") !== month) {
        throw new BadRequestException(`日期 ${item.date} 不属于 ${month}`)
      }
      if (d.isBefore(start, "day") || d.isAfter(end, "day")) {
        throw new BadRequestException(`日期 ${item.date} 超出当月范围`)
      }

      if (!item.shiftType) {
        await this.prisma.scheduleEntry.deleteMany({
          where: { userId: item.userId, date: item.date },
        })
        continue
      }

      await this.prisma.scheduleEntry.upsert({
        where: {
          userId_date: { userId: item.userId, date: item.date },
        },
        create: {
          userId: item.userId,
          date: item.date,
          shiftType: item.shiftType,
          isManual: true,
        },
        update: {
          shiftType: item.shiftType,
          isManual: true,
        },
      })
    }

    return await this.getMonth(month)
  }

  async autoFillFromPunches(month: string) {
    const { start, end } = monthBounds(month)

    const users = await this.prisma.user.findMany({
      where: { role: "user" },
      select: { id: true },
    })

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        punchTime: {
          gte: start.startOf("day").toDate(),
          lte: end.endOf("day").toDate(),
        },
      },
      orderBy: { punchTime: "asc" },
    })

    const byUserDay = new Map<string, Array<{ type: string; punchTime: Date }>>()
    for (const r of records) {
      const date = dayjs(r.punchTime).format("YYYY-MM-DD")
      const key = `${r.userId}:${date}`
      const arr = byUserDay.get(key) ?? []
      arr.push(r)
      byUserDay.set(key, arr)
    }

    const existing = await this.prisma.scheduleEntry.findMany({
      where: {
        date: {
          gte: start.format("YYYY-MM-DD"),
          lte: end.format("YYYY-MM-DD"),
        },
      },
    })
    const manualKeys = new Set(
      existing.filter((e) => e.isManual).map((e) => `${e.userId}:${e.date}`)
    )

    for (const user of users) {
      for (let d = start; !d.isAfter(end, "day"); d = d.add(1, "day")) {
        const date = d.format("YYYY-MM-DD")
        const key = `${user.id}:${date}`
        if (manualKeys.has(key)) continue

        const dayRecords = byUserDay.get(key) ?? []
        const inferred = this.inferShiftFromPunches(dayRecords)

        if (!inferred) {
          await this.prisma.scheduleEntry.deleteMany({
            where: { userId: user.id, date },
          })
          continue
        }

        await this.prisma.scheduleEntry.upsert({
          where: {
            userId_date: { userId: user.id, date },
          },
          create: {
            userId: user.id,
            date,
            shiftType: inferred,
            isManual: false,
          },
          update: {
            shiftType: inferred,
            isManual: false,
          },
        })
      }
    }

    return await this.getMonth(month)
  }
}
