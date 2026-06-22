import { BadRequestException, Injectable } from "@nestjs/common"
import dayjs from "dayjs"

import { PrismaService } from "../../prisma/prisma.service"
import { DEFAULT_SHIFT_ROW, DEFAULT_GEOFENCE_ROW } from "./defaults"
import type { UpsertGeofenceDto } from "./dto/geofence.dto"
import type { UpsertShiftDto } from "./dto/shift.dto"
import type { PunchDto } from "./dto/punch.dto"
import { minutesFromMidnight } from "./time"

const GLOBAL_CONFIG_ID = "global" as const

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

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
    const todayStart = dayjs(now).startOf("day").toDate()
    const tomorrowStart = dayjs(now).add(1, "day").startOf("day").toDate()

    const todayRecords = await this.prisma.attendanceRecord.findMany({
      where: { userId, punchTime: { gte: todayStart, lt: tomorrowStart } },
      orderBy: { punchTime: "asc" },
    })
    const map = new Map(todayRecords.map((r) => [r.type, r]))

    const wall = now.getHours() * 60 + now.getMinutes()
    const inRange = (start: string, end: string) => {
      const a = minutesFromMidnight(start)
      const b = minutesFromMidnight(end)
      return wall >= a && wall <= b
    }

    const type = dto.type
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

    const existing = map.get(type)
    if (existing) {
      return await this.prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          punchTime: now,
          latitude: dto.latitude,
          longitude: dto.longitude,
          address: dto.address ?? "",
        },
      })
    }

    return await this.prisma.attendanceRecord.create({
      data: {
        userId,
        type,
        punchTime: now,
        latitude: dto.latitude,
        longitude: dto.longitude,
        address: dto.address ?? "",
      },
    })
  }

  async today(userId: string) {
    const now = new Date()
    const todayStart = dayjs(now).startOf("day").toDate()
    const tomorrowStart = dayjs(now).add(1, "day").startOf("day").toDate()
    return await this.prisma.attendanceRecord.findMany({
      where: { userId, punchTime: { gte: todayStart, lt: tomorrowStart } },
      orderBy: { punchTime: "asc" },
    })
  }

  async records(userId: string, startDate: string, endDate: string) {
    const start = dayjs(startDate, "YYYY-MM-DD").startOf("day")
    const end = dayjs(endDate, "YYYY-MM-DD").add(1, "day").startOf("day")
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      throw new BadRequestException("日期范围不合法")
    }
    return await this.prisma.attendanceRecord.findMany({
      where: { userId, punchTime: { gte: start.toDate(), lt: end.toDate() } },
      orderBy: { punchTime: "asc" },
    })
  }

  async monthlySummary(userId: string, month: string) {
    const base = dayjs(`${month}-01`, "YYYY-MM-DD")
    if (!base.isValid()) throw new BadRequestException("月份不合法")
    const start = base.startOf("month")
    const end = base.isSame(dayjs(), "month") ? dayjs() : base.endOf("month")

    const startDate = start.format("YYYY-MM-DD")
    const rangeEnd = end.format("YYYY-MM-DD")

    const list = await this.prisma.attendanceRecord.findMany({
      where: {
        userId,
        punchTime: {
          gte: start.toDate(),
          lt: end.add(1, "day").startOf("day").toDate(),
        },
      },
      orderBy: { punchTime: "asc" },
    })

    const byDate = new Map<string, typeof list>()
    for (const r of list) {
      const key = dayjs(r.punchTime).format("YYYY-MM-DD")
      const arr = byDate.get(key) ?? []
      arr.push(r)
      byDate.set(key, arr)
    }

    const shift = await this.getShift()
    const normalMorningEnd = minutesFromMidnight(shift.overtimeMorningNormalEnd)
    const normalAfternoonEnd = minutesFromMidnight(
      shift.overtimeAfternoonNormalEnd
    )

    let attendanceDays = 0
    let restDays = 0
    let missingSlots = 0
    let overtimeMinutes = 0
    const rows: Array<{
      date: string
      morningIn: string | null
      morningOut: string | null
      afternoonIn: string | null
      afternoonOut: string | null
      morningOutIsMakeup: boolean
      afternoonOutIsMakeup: boolean
      overtimeMinutes: number
      overtimeStr: string
    }> = []

    const fmtOvertime = (m: number) => {
      if (m <= 0) return "-"
      const h = Math.floor(m / 60)
      const mm = m % 60
      if (h <= 0) return `${mm}分钟`
      if (mm <= 0) return `${h}小时`
      return `${h}小时${mm}分钟`
    }

    for (
      let d = end;
      d.isAfter(start, "day") || d.isSame(start, "day");
      d = d.subtract(1, "day")
    ) {
      const ymd = d.format("YYYY-MM-DD")
      const dayRecords = (byDate.get(ymd) ?? []).slice()
      const row = {
        date: ymd,
        morningIn: null as string | null,
        morningOut: null as string | null,
        afternoonIn: null as string | null,
        afternoonOut: null as string | null,
        morningOutIsMakeup: false,
        afternoonOutIsMakeup: false,
        overtimeMinutes: 0,
        overtimeStr: "-",
      }

      for (const r of dayRecords) {
        const hm = dayjs(r.punchTime).format("HH:mm")
        if (r.type === "morning_in") row.morningIn = hm
        if (r.type === "morning_out") {
          row.morningOut = hm
          row.morningOutIsMakeup = r.source === "makeup"
        }
        if (r.type === "afternoon_in") row.afternoonIn = hm
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
      if (!hasAny) {
        restDays += 1
        rows.push(row)
        continue
      }

      const dayStats = applyDayAttendanceRest(row)
      attendanceDays += dayStats.attendanceDays
      restDays += dayStats.restDays

      const slots = [
        row.morningIn,
        row.morningOut,
        row.afternoonIn,
        row.afternoonOut,
      ]
      missingSlots += slots.filter((x) => !x).length

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
      row.overtimeStr = fmtOvertime(overtime)
      overtimeMinutes += overtime

      rows.push(row)
    }

    return {
      month,
      startDate,
      rangeEnd,
      attendanceDays,
      restDays,
      missingSlots,
      overtimeMinutes,
      overtimeStr: fmtOvertime(overtimeMinutes),
      rows,
    }
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

function applyDayAttendanceRest(row: {
  morningIn: string | null
  morningOut: string | null
  afternoonIn: string | null
  afternoonOut: string | null
}): { attendanceDays: number; restDays: number } {
  const hasAny = !!(
    row.morningIn ||
    row.morningOut ||
    row.afternoonIn ||
    row.afternoonOut
  )
  if (!hasAny) {
    return { attendanceDays: 0, restDays: 1 }
  }

  let attendanceDays = 0
  let restDays = 0

  if (row.morningIn) attendanceDays += 0.5
  else restDays += 0.5

  if (row.afternoonIn) attendanceDays += 0.5
  else restDays += 0.5

  return { attendanceDays, restDays }
}
