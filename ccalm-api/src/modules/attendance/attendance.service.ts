import { BadRequestException, Injectable } from "@nestjs/common"
import type { AttendancePunchType, Prisma } from "@prisma/client"

import { isPrismaUniqueViolation } from "../../common/prisma-errors"
import { PrismaService } from "../../prisma/prisma.service"
import { AttendanceScheduleService } from "./attendance-schedule.service"
import { attendanceDayjs } from "./attendance-dayjs"
import { DEFAULT_SHIFT_ROW, DEFAULT_GEOFENCE_ROW } from "./defaults"
import type { UpsertGeofenceDto } from "./dto/geofence.dto"
import type { UpsertShiftDto } from "./dto/shift.dto"
import type { PunchDto } from "./dto/punch.dto"
import {
  computeMonthlySummaryAggregate,
  monthSummaryBounds,
} from "./monthly-summary-compute"
import { punchDateFromTime } from "./punch-date"
import { minutesFromMidnight } from "./time"

const GLOBAL_CONFIG_ID = "global" as const

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedule: AttendanceScheduleService
  ) {}

  async getGeofence() {
    const row = await this.prisma.geofenceConfig.findUnique({
      where: { id: GLOBAL_CONFIG_ID },
    })
    return (
      row ?? {
        id: GLOBAL_CONFIG_ID,
        ...DEFAULT_GEOFENCE_ROW,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      }
    )
  }

  async upsertGeofence(dto: UpsertGeofenceDto) {
    return await this.prisma.geofenceConfig.upsert({
      where: { id: GLOBAL_CONFIG_ID },
      create: {
        id: GLOBAL_CONFIG_ID,
        enabled: dto.enabled,
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        radiusM: dto.radiusM,
        label: dto.label ?? "",
      },
      update: {
        enabled: dto.enabled,
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        radiusM: dto.radiusM,
        label: dto.label ?? "",
      },
    })
  }

  async getShift() {
    const row = await this.prisma.shiftConfig.findUnique({
      where: { id: GLOBAL_CONFIG_ID },
    })
    return (
      row ?? {
        id: GLOBAL_CONFIG_ID,
        ...DEFAULT_SHIFT_ROW,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      }
    )
  }

  async upsertShift(dto: UpsertShiftDto) {
    return await this.prisma.shiftConfig.upsert({
      where: { id: GLOBAL_CONFIG_ID },
      create: {
        id: GLOBAL_CONFIG_ID,
        morningLabel: dto.morningLabel,
        morningRangeStart: dto.morningRangeStart,
        morningRangeEnd: dto.morningRangeEnd,
        afternoonLabel: dto.afternoonLabel,
        afternoonRangeStart: dto.afternoonRangeStart,
        afternoonRangeEnd: dto.afternoonRangeEnd,
        morningInWindowStart: dto.morningInWindowStart,
        morningInWindowEnd: dto.morningInWindowEnd,
        morningOutWindowStart: dto.morningOutWindowStart,
        morningOutWindowEnd: dto.morningOutWindowEnd,
        afternoonInWindowStart: dto.afternoonInWindowStart,
        afternoonInWindowEnd: dto.afternoonInWindowEnd,
        afternoonOutWindowStart: dto.afternoonOutWindowStart,
        afternoonOutWindowEnd: dto.afternoonOutWindowEnd,
        overtimeMorningNormalEnd: dto.overtimeMorningNormalEnd,
        overtimeAfternoonNormalEnd: dto.overtimeAfternoonNormalEnd,
      },
      update: {
        morningLabel: dto.morningLabel,
        morningRangeStart: dto.morningRangeStart,
        morningRangeEnd: dto.morningRangeEnd,
        afternoonLabel: dto.afternoonLabel,
        afternoonRangeStart: dto.afternoonRangeStart,
        afternoonRangeEnd: dto.afternoonRangeEnd,
        morningInWindowStart: dto.morningInWindowStart,
        morningInWindowEnd: dto.morningInWindowEnd,
        morningOutWindowStart: dto.morningOutWindowStart,
        morningOutWindowEnd: dto.morningOutWindowEnd,
        afternoonInWindowStart: dto.afternoonInWindowStart,
        afternoonInWindowEnd: dto.afternoonInWindowEnd,
        afternoonOutWindowStart: dto.afternoonOutWindowStart,
        afternoonOutWindowEnd: dto.afternoonOutWindowEnd,
        overtimeMorningNormalEnd: dto.overtimeMorningNormalEnd,
        overtimeAfternoonNormalEnd: dto.overtimeAfternoonNormalEnd,
      },
    })
  }

  async punch(userId: string, dto: PunchDto) {
    const shift = await this.getShift()
    const fence = await this.getGeofence()

    if (fence.enabled) {
      const d = haversineDistanceMeters(
        dto.latitude,
        dto.longitude,
        fence.centerLat,
        fence.centerLng
      )
      if (d > fence.radiusM) {
        throw new BadRequestException("当前位置不在允许打卡范围内")
      }
    }

    const now = new Date()
    const punchDate = punchDateFromTime(now)
    const type = dto.type

    await this.schedule.assertHalfOpenForPunch(userId, punchDate, type)

    return await this.prisma.$transaction(async (tx) => {
      const todayRecords = await tx.attendanceRecord.findMany({
        where: { userId, punchDate },
        orderBy: { punchTime: "asc" },
      })
      const map = new Map(todayRecords.map((r) => [r.type, r]))

      const wall =
        attendanceDayjs(now).hour() * 60 + attendanceDayjs(now).minute()
      const inRange = (start: string, end: string) => {
        const a = minutesFromMidnight(start)
        const b = minutesFromMidnight(end)
        return wall >= a && wall <= b
      }

      this.assertPunchWindow(type, map, shift, inRange)

      const existing = map.get(type)
      if (existing) {
        return await this.updateOutPunch(tx, existing.id, type, now, dto)
      }

      try {
        return await tx.attendanceRecord.create({
          data: {
            userId,
            type,
            punchDate,
            punchTime: now,
            latitude: dto.latitude,
            longitude: dto.longitude,
            address: dto.address ?? "",
          },
        })
      } catch (error) {
        if (!isPrismaUniqueViolation(error)) throw error
        return await this.resolveConcurrentPunch(
          tx,
          userId,
          type,
          punchDate,
          now,
          dto
        )
      }
    })
  }

  private assertPunchWindow(
    type: AttendancePunchType,
    map: Map<AttendancePunchType, { id: string }>,
    shift: Awaited<ReturnType<AttendanceService["getShift"]>>,
    inRange: (start: string, end: string) => boolean
  ) {
    if (type === "morning_in") {
      if (!inRange(shift.morningInWindowStart, shift.morningInWindowEnd)) {
        throw new BadRequestException(
          `「上午上班」仅允许在 ${shift.morningInWindowStart} - ${shift.morningInWindowEnd} 内打卡`
        )
      }
    }
    if (type === "morning_out") {
      if (!map.get("morning_in"))
        throw new BadRequestException("请先打上午上班，再打上午下班")
      if (!inRange(shift.morningOutWindowStart, shift.morningOutWindowEnd)) {
        throw new BadRequestException(
          `「上午下班」仅允许在 ${shift.morningOutWindowStart} - ${shift.morningOutWindowEnd} 内打卡`
        )
      }
    }
    if (type === "afternoon_in") {
      if (!inRange(shift.afternoonInWindowStart, shift.afternoonInWindowEnd)) {
        throw new BadRequestException(
          `「下午上班」仅允许在 ${shift.afternoonInWindowStart} - ${shift.afternoonInWindowEnd} 内打卡`
        )
      }
    }
    if (type === "afternoon_out") {
      if (!map.get("afternoon_in"))
        throw new BadRequestException("请先打下午上班，再打下午下班")
      if (
        !inRange(shift.afternoonOutWindowStart, shift.afternoonOutWindowEnd)
      ) {
        throw new BadRequestException(
          `「下午下班」仅允许在 ${shift.afternoonOutWindowStart} - ${shift.afternoonOutWindowEnd} 内打卡`
        )
      }
    }
  }

  private async updateOutPunch(
    tx: Prisma.TransactionClient,
    recordId: string,
    type: AttendancePunchType,
    now: Date,
    dto: PunchDto
  ) {
    if (type === "morning_in" || type === "afternoon_in") {
      throw new BadRequestException("今日该上班卡已打过，不可重复打卡")
    }
    return await tx.attendanceRecord.update({
      where: { id: recordId },
      data: {
        punchTime: now,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address ?? "",
      },
    })
  }

  private async resolveConcurrentPunch(
    tx: Prisma.TransactionClient,
    userId: string,
    type: AttendancePunchType,
    punchDate: string,
    now: Date,
    dto: PunchDto
  ) {
    const existing = await tx.attendanceRecord.findUnique({
      where: { userId_type_punchDate: { userId, type, punchDate } },
    })
    if (!existing) {
      throw new BadRequestException("打卡冲突，请重试")
    }
    return await this.updateOutPunch(tx, existing.id, type, now, dto)
  }

  async today(userId: string) {
    const punchDate = punchDateFromTime(new Date())
    return await this.prisma.attendanceRecord.findMany({
      where: { userId, punchDate },
      orderBy: { punchTime: "asc" },
    })
  }

  async records(userId: string, startDate: string, endDate: string) {
    const start = attendanceDayjs(startDate, "YYYY-MM-DD").startOf("day")
    const end = attendanceDayjs(endDate, "YYYY-MM-DD")
      .add(1, "day")
      .startOf("day")
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      throw new BadRequestException("日期范围不合法")
    }
    return await this.prisma.attendanceRecord.findMany({
      where: { userId, punchTime: { gte: start.toDate(), lt: end.toDate() } },
      orderBy: { punchTime: "asc" },
    })
  }

  async monthlySummary(userId: string, month: string) {
    const bounds = monthSummaryBounds(month)
    if (!bounds) throw new BadRequestException("月份不合法")

    const { start, end, todayYmd, startDate, rangeEnd } = bounds

    const [scheduleMap, list, shift, pendingMakeups] = await Promise.all([
      this.schedule.scheduleMapForUser(userId, startDate, rangeEnd),
      this.prisma.attendanceRecord.findMany({
        where: {
          userId,
          punchTime: {
            gte: bounds.rangeStart,
            lt: bounds.rangeEndExclusive,
          },
        },
        orderBy: { punchTime: "asc" },
      }),
      this.getShift(),
      this.prisma.attendanceMakeupRequest.findMany({
        where: {
          userId,
          status: "pending",
          date: { gte: startDate, lte: rangeEnd },
        },
        select: { date: true, type: true, status: true },
      }),
    ])

    const aggregate = computeMonthlySummaryAggregate({
      start,
      end,
      todayYmd,
      scheduleMap,
      records: list,
      shift,
      pendingMakeups,
    })

    const remainingLeave = await this.schedule.getRemainingLeave(userId, month)

    return {
      month,
      startDate,
      rangeEnd,
      ...aggregate,
      remainingLeave,
    }
  }

  async monthlySummariesForAll(month: string) {
    const bounds = monthSummaryBounds(month)
    if (!bounds) throw new BadRequestException("月份不合法")

    const users = await this.prisma.user.findMany({
      orderBy: [{ displayName: "asc" }, { username: "asc" }],
      select: { id: true, displayName: true, username: true },
    })
    if (!users.length) return []

    const userIds = users.map((u) => u.id)
    const { start, end, todayYmd, startDate, rangeEnd } = bounds

    const [scheduleMaps, allRecords, shift, allPending] = await Promise.all([
      this.schedule.scheduleMapsForUsers(userIds, startDate, rangeEnd),
      this.prisma.attendanceRecord.findMany({
        where: {
          userId: { in: userIds },
          punchTime: {
            gte: bounds.rangeStart,
            lt: bounds.rangeEndExclusive,
          },
        },
        orderBy: { punchTime: "asc" },
      }),
      this.getShift(),
      this.prisma.attendanceMakeupRequest.findMany({
        where: {
          userId: { in: userIds },
          status: "pending",
          date: { gte: startDate, lte: rangeEnd },
        },
        select: { userId: true, date: true, type: true, status: true },
      }),
    ])

    const recordsByUser = new Map<string, typeof allRecords>()
    for (const r of allRecords) {
      const arr = recordsByUser.get(r.userId) ?? []
      arr.push(r)
      recordsByUser.set(r.userId, arr)
    }

    const pendingByUser = new Map<
      string,
      Array<{ date: string; type: string; status: string }>
    >()
    for (const p of allPending) {
      const arr = pendingByUser.get(p.userId) ?? []
      arr.push({ date: p.date, type: p.type, status: p.status })
      pendingByUser.set(p.userId, arr)
    }

    return users.map((u) => {
      const userScheduleMap =
        scheduleMaps.get(u.id) ??
        new Map<string, "full_rest" | "morning_rest" | "afternoon_rest">()
      const aggregate = computeMonthlySummaryAggregate({
        start,
        end,
        todayYmd,
        scheduleMap: userScheduleMap,
        records: recordsByUser.get(u.id) ?? [],
        shift,
        pendingMakeups: pendingByUser.get(u.id) ?? [],
      })
      return {
        userId: u.id,
        userName: u.displayName || u.username,
        attendanceDays: aggregate.attendanceDays,
        restDays: aggregate.restDays,
        missingSlots: aggregate.missingSlots,
        overtimeStr: aggregate.overtimeStr,
        rows: aggregate.rows,
      }
    })
  }
}

function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
