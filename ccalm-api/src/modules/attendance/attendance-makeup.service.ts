import { Prisma } from "@prisma/client"
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"

import { isPrismaUniqueViolation } from "../../common/prisma-errors"
import { PrismaService } from "../../prisma/prisma.service"
import { AttendanceScheduleService } from "./attendance-schedule.service"
import { attendanceDayjs, attendanceTodayStart } from "./attendance-dayjs"
import {
  adminMakeupSlotDenyReason,
  buildDayPunchRow,
  employeeMakeupSlotDenyReason,
  makeupSlotDenyMessage,
  makeupSlotsEnv,
  type MakeupSlotDenyReason,
  type PendingMakeup,
} from "./makeup-slots"
import {
  canMakeupTodaySlotForDate,
  type MakeupTodayGate,
} from "./attendance-makeup-today-gate"
import type { MakeupSlotType } from "./makeup-today-gate"
import { DEFAULT_SHIFT_ROW } from "./defaults"
import type { CreateMakeupRequestDto } from "./dto/makeup-request.dto"
import { punchDateFromTime } from "./punch-date"

dayjs.extend(customParseFormat)

const MAKEUP_IN_TYPES = ["morning_in", "afternoon_in"] as const
type MakeupInType = (typeof MAKEUP_IN_TYPES)[number]

const MAKEUP_OUT_TYPES = ["morning_out", "afternoon_out"] as const
type MakeupOutType = (typeof MAKEUP_OUT_TYPES)[number]

const MAKEUP_REQUEST_TYPES = [...MAKEUP_IN_TYPES, ...MAKEUP_OUT_TYPES] as const
type MakeupRequestType = (typeof MAKEUP_REQUEST_TYPES)[number]

const ADMIN_MAKEUP_TYPES = [
  "morning_in",
  "morning_out",
  "afternoon_in",
  "afternoon_out",
] as const
type AdminMakeupType = (typeof ADMIN_MAKEUP_TYPES)[number]

const OUT_TYPE_BY_IN: Record<MakeupInType, MakeupOutType> = {
  morning_in: "morning_out",
  afternoon_in: "afternoon_out",
}

@Injectable()
export class AttendanceMakeupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedule: AttendanceScheduleService
  ) {}

  private createMakeupRecordData(
    userId: string,
    type: AdminMakeupType,
    punchTime: Date
  ) {
    return {
      userId,
      type,
      punchDate: punchDateFromTime(punchTime),
      punchTime,
      latitude: 0,
      longitude: 0,
      address: "补卡",
      source: "makeup" as const,
    }
  }

  private async createMakeupRecord(
    tx: Prisma.TransactionClient,
    userId: string,
    type: AdminMakeupType,
    punchTime: Date
  ) {
    try {
      return await tx.attendanceRecord.create({
        data: this.createMakeupRecordData(userId, type, punchTime),
      })
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new BadRequestException("该打卡记录已存在")
      }
      throw error
    }
  }

  private async createAutoOutIfNeeded(
    tx: Prisma.TransactionClient,
    userId: string,
    dateStr: string,
    type: MakeupInType
  ) {
    const autoOut = await this.buildAutoOutRecord(userId, dateStr, type)
    if (!autoOut) return

    const existing = await tx.attendanceRecord.findUnique({
      where: {
        userId_type_punchDate: {
          userId,
          type: autoOut.type,
          punchDate: dateStr,
        },
      },
    })
    if (existing) return

    await this.createMakeupRecord(tx, userId, autoOut.type, autoOut.punchTime)
  }

  private shouldAutoMakeupOut(dateStr: string, type: MakeupRequestType) {
    if (!MAKEUP_IN_TYPES.includes(type as MakeupInType)) return false
    return dateStr !== attendanceTodayStart().format("YYYY-MM-DD")
  }

  private async buildAutoOutRecord(
    _userId: string,
    dateStr: string,
    type: MakeupInType
  ) {
    if (!this.shouldAutoMakeupOut(dateStr, type)) return null

    const shift = await this.prisma.shiftConfig.findUnique({
      where: { id: "global" },
    })
    const outType = OUT_TYPE_BY_IN[type]
    const time =
      type === "morning_in"
        ? (shift?.overtimeMorningNormalEnd ??
          DEFAULT_SHIFT_ROW.overtimeMorningNormalEnd)
        : (shift?.overtimeAfternoonNormalEnd ??
          DEFAULT_SHIFT_ROW.overtimeAfternoonNormalEnd)
    const punchTime = attendanceDayjs(`${dateStr} ${time}`, "YYYY-MM-DD HH:mm")
    if (!punchTime.isValid()) return null

    return {
      type: outType,
      punchTime: punchTime.toDate(),
    }
  }

  private async getMakeupTodayGate(): Promise<MakeupTodayGate> {
    const row = await this.prisma.shiftConfig.findUnique({
      where: { id: "global" },
    })
    return {
      morningInWindowEnd:
        row?.morningInWindowEnd ?? DEFAULT_SHIFT_ROW.morningInWindowEnd,
      afternoonInWindowEnd:
        row?.afternoonInWindowEnd ?? DEFAULT_SHIFT_ROW.afternoonInWindowEnd,
    }
  }

  private async dayRecords(userId: string, dateStr: string) {
    return await this.prisma.attendanceRecord.findMany({
      where: { userId, punchDate: dateStr },
    })
  }

  private async buildMakeupRow(userId: string, dateStr: string) {
    const [records, declaredRest] = await Promise.all([
      this.dayRecords(userId, dateStr),
      this.schedule.resolveShiftForUserDay(userId, dateStr),
    ])
    return buildDayPunchRow(dateStr, declaredRest, records)
  }

  private async pendingForUserDate(
    userId: string,
    dateStr: string,
    excludeRequestId?: string
  ): Promise<PendingMakeup[]> {
    const rows = await this.prisma.attendanceMakeupRequest.findMany({
      where: {
        userId,
        date: dateStr,
        status: "pending",
        ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
      },
      select: { date: true, type: true, status: true },
    })
    return rows
  }

  private throwIfMakeupDenied(
    reason: MakeupSlotDenyReason | null,
    type: MakeupSlotType
  ) {
    if (!reason) return
    throw new BadRequestException(makeupSlotDenyMessage(reason, type))
  }

  private async assertEmployeeMakeupSlot(
    userId: string,
    dateStr: string,
    type: MakeupSlotType,
    excludeRequestId?: string
  ) {
    const [row, gate, pending] = await Promise.all([
      this.buildMakeupRow(userId, dateStr),
      this.getMakeupTodayGate(),
      this.pendingForUserDate(userId, dateStr, excludeRequestId),
    ])
    const env = makeupSlotsEnv()
    const reason = employeeMakeupSlotDenyReason(
      row,
      type,
      pending,
      env,
      gate,
      new Date()
    )
    this.throwIfMakeupDenied(reason, type)
  }

  private async assertAdminMakeupSlot(
    userId: string,
    dateStr: string,
    type: AdminMakeupType
  ) {
    const [row, gate] = await Promise.all([
      this.buildMakeupRow(userId, dateStr),
      this.getMakeupTodayGate(),
    ])
    const env = makeupSlotsEnv()
    const reason = adminMakeupSlotDenyReason(row, type, env, gate, new Date())
    this.throwIfMakeupDenied(reason, type)
  }

  private serializeRequest(row: {
    id: string
    userId: string
    date: string
    type: string
    punchTime: Date
    reason: string
    status: string
    reviewedAt: Date | null
    createdAt: Date
    user: { displayName: string; username: string }
    reviewer: { displayName: string; username: string } | null
  }) {
    return {
      id: row.id,
      userId: row.userId,
      userName: row.user.displayName || row.user.username,
      date: row.date,
      type: row.type,
      punchTime: row.punchTime.toISOString(),
      reason: row.reason,
      status: row.status,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      reviewerName: row.reviewer
        ? row.reviewer.displayName || row.reviewer.username
        : null,
    }
  }

  private includeUser() {
    return {
      user: { select: { displayName: true, username: true } },
      reviewer: { select: { displayName: true, username: true } },
    } as const
  }

  async createRequest(userId: string, dto: CreateMakeupRequestDto) {
    const type = dto.type
    if (!MAKEUP_REQUEST_TYPES.includes(type)) {
      throw new BadRequestException("补卡类型不合法")
    }

    await this.assertEmployeeMakeupSlot(userId, dto.date, type)

    const punchTime = dayjs(`${dto.date} ${dto.time}`, "YYYY-MM-DD HH:mm", true)
    if (!punchTime.isValid()) {
      throw new BadRequestException("补卡时间不合法")
    }

    const row = await this.prisma.attendanceMakeupRequest.create({
      data: {
        userId,
        date: dto.date,
        type,
        punchTime: punchTime.toDate(),
        reason: "",
      },
      include: this.includeUser(),
    })
    return this.serializeRequest(row)
  }

  async listMine(userId: string) {
    const rows = await this.prisma.attendanceMakeupRequest.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }],
      include: this.includeUser(),
    })
    return rows.map((r) => this.serializeRequest(r))
  }

  async pendingCount() {
    return await this.prisma.attendanceMakeupRequest.count({
      where: { status: "pending" },
    })
  }

  async listForAdmin(status?: string) {
    const where =
      status === "pending"
        ? { status: "pending" as const }
        : status === "approved"
          ? { status: "approved" as const }
          : status === "rejected"
            ? { status: "rejected" as const }
            : undefined

    const rows = await this.prisma.attendanceMakeupRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: this.includeUser(),
    })
    return rows.map((r) => this.serializeRequest(r))
  }

  async approve(requestId: string, adminId: string) {
    const req = await this.prisma.attendanceMakeupRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    })
    if (!req) throw new NotFoundException("补卡申请不存在")
    if (req.status !== "pending") {
      throw new BadRequestException("该申请已处理")
    }

    const type = req.type
    if (!MAKEUP_REQUEST_TYPES.includes(type)) {
      throw new BadRequestException("申请类型不合法")
    }

    await this.assertEmployeeMakeupSlot(req.userId, req.date, type, requestId)

    const autoOut = MAKEUP_IN_TYPES.includes(type as MakeupInType)
      ? await this.buildAutoOutRecord(
          req.userId,
          req.date,
          type as MakeupInType
        )
      : null
    if (autoOut) {
      const records = await this.dayRecords(req.userId, req.date)
      if (records.some((r) => r.type === autoOut.type)) {
        throw new BadRequestException("该下班卡已存在，无需补卡")
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.attendanceMakeupRequest.updateMany({
        where: { id: requestId, status: "pending" },
        data: {
          status: "approved",
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      })
      if (claimed.count === 0) {
        throw new BadRequestException("该申请已处理")
      }

      await this.createMakeupRecord(tx, req.userId, req.type, req.punchTime)

      if (MAKEUP_IN_TYPES.includes(type as MakeupInType)) {
        await this.createAutoOutIfNeeded(
          tx,
          req.userId,
          req.date,
          type as MakeupInType
        )
      }

      const row = await tx.attendanceMakeupRequest.findUnique({
        where: { id: requestId },
        include: this.includeUser(),
      })
      if (!row) throw new NotFoundException("补卡申请不存在")
      return row
    })

    return this.serializeRequest(updated)
  }

  async reject(requestId: string, adminId: string) {
    const req = await this.prisma.attendanceMakeupRequest.findUnique({
      where: { id: requestId },
    })
    if (!req) throw new NotFoundException("补卡申请不存在")

    const { count } = await this.prisma.attendanceMakeupRequest.updateMany({
      where: { id: requestId, status: "pending" },
      data: {
        status: "rejected",
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    })
    if (count === 0) {
      throw new BadRequestException("该申请已处理")
    }

    const updated = await this.prisma.attendanceMakeupRequest.findUnique({
      where: { id: requestId },
      include: this.includeUser(),
    })
    if (!updated) throw new NotFoundException("补卡申请不存在")
    return this.serializeRequest(updated)
  }

  async directMakeup(dto: {
    userId: string
    date: string
    type: AdminMakeupType
    time: string
  }) {
    const type = dto.type
    if (!ADMIN_MAKEUP_TYPES.includes(type)) {
      throw new BadRequestException("补卡类型不合法")
    }

    await this.assertAdminMakeupSlot(dto.userId, dto.date, type)

    const punchTime = dayjs(`${dto.date} ${dto.time}`, "YYYY-MM-DD HH:mm", true)
    if (!punchTime.isValid()) {
      throw new BadRequestException("补卡时间不合法")
    }

    const record = await this.prisma.$transaction(async (tx) => {
      await tx.attendanceMakeupRequest.deleteMany({
        where: {
          userId: dto.userId,
          date: dto.date,
          type,
          status: "pending",
        },
      })

      const created = await this.createMakeupRecord(
        tx,
        dto.userId,
        type,
        punchTime.toDate()
      )

      if (MAKEUP_IN_TYPES.includes(type as MakeupInType)) {
        await this.createAutoOutIfNeeded(
          tx,
          dto.userId,
          dto.date,
          type as MakeupInType
        )
      }

      return created
    })

    return {
      id: record.id,
      userId: record.userId,
      type: record.type,
      punchTime: record.punchTime.toISOString(),
      source: record.source,
    }
  }
}
