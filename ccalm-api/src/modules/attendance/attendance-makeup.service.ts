import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"

import { PrismaService } from "../../prisma/prisma.service"
import type { CreateMakeupRequestDto } from "./dto/makeup-request.dto"

dayjs.extend(customParseFormat)

const MAKEUP_OUT_TYPES = ["morning_out", "afternoon_out"] as const
type MakeupOutType = (typeof MAKEUP_OUT_TYPES)[number]

const ADMIN_MAKEUP_TYPES = [
  "morning_in",
  "morning_out",
  "afternoon_in",
  "afternoon_out",
] as const
type AdminMakeupType = (typeof ADMIN_MAKEUP_TYPES)[number]

const IN_TYPE_BY_OUT: Record<MakeupOutType, "morning_in" | "afternoon_in"> = {
  morning_out: "morning_in",
  afternoon_out: "afternoon_in",
}

@Injectable()
export class AttendanceMakeupService {
  constructor(private readonly prisma: PrismaService) {}

  private isWithinMakeupWindow(dateStr: string): boolean {
    const d = dayjs(dateStr, "YYYY-MM-DD", true)
    if (!d.isValid()) return false
    const today = dayjs().startOf("day")
    const earliest = today.subtract(29, "day")
    return !d.isBefore(earliest) && !d.isAfter(today)
  }

  private async dayRecordMap(userId: string, dateStr: string) {
    const start = dayjs(dateStr, "YYYY-MM-DD").startOf("day").toDate()
    const end = dayjs(dateStr, "YYYY-MM-DD").add(1, "day").startOf("day").toDate()
    const records = await this.prisma.attendanceRecord.findMany({
      where: { userId, punchTime: { gte: start, lt: end } },
    })
    return new Map(records.map((r) => [r.type, r]))
  }

  private async assertMakeupSlotAvailable(
    userId: string,
    dateStr: string,
    type: MakeupOutType,
    excludeRequestId?: string,
    options?: { skipPendingCheck?: boolean }
  ) {
    if (!this.isWithinMakeupWindow(dateStr)) {
      throw new BadRequestException("仅支持补最近 30 天内的缺卡")
    }

    const map = await this.dayRecordMap(userId, dateStr)
    const inType = IN_TYPE_BY_OUT[type]
    if (!map.get(inType)) {
      throw new BadRequestException("需先有对应上班打卡记录，才能补下班卡")
    }
    if (map.get(type)) {
      throw new BadRequestException("该下班卡已存在，无需补卡")
    }

    const pending = options?.skipPendingCheck
      ? null
      : await this.prisma.attendanceMakeupRequest.findFirst({
          where: {
            userId,
            date: dateStr,
            type,
            status: "pending",
            ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
          },
        })
    if (pending) {
      throw new BadRequestException("该缺卡已有审批中的补卡申请")
    }
  }

  private async assertAdminMakeupSlotAvailable(
    userId: string,
    dateStr: string,
    type: AdminMakeupType
  ) {
    if (!this.isWithinMakeupWindow(dateStr)) {
      throw new BadRequestException("仅支持补最近 30 天内的缺卡")
    }

    const map = await this.dayRecordMap(userId, dateStr)
    if (map.get(type)) {
      throw new BadRequestException("该打卡已存在，无需补卡")
    }
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
    rejectReason: string
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
      rejectReason: row.rejectReason,
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
    if (!MAKEUP_OUT_TYPES.includes(type)) {
      throw new BadRequestException("仅支持补上午下班或下午下班")
    }

    await this.assertMakeupSlotAvailable(userId, dto.date, type)

    const punchTime = dayjs(
      `${dto.date} ${dto.time}`,
      "YYYY-MM-DD HH:mm",
      true
    )
    if (!punchTime.isValid()) {
      throw new BadRequestException("补卡时间不合法")
    }

    const row = await this.prisma.attendanceMakeupRequest.create({
      data: {
        userId,
        date: dto.date,
        type,
        punchTime: punchTime.toDate(),
        reason: dto.reason.trim(),
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

    const type = req.type as MakeupOutType
    if (!MAKEUP_OUT_TYPES.includes(type)) {
      throw new BadRequestException("申请类型不合法")
    }

    await this.assertMakeupSlotAvailable(req.userId, req.date, type, requestId)

    const [, updated] = await this.prisma.$transaction([
      this.prisma.attendanceRecord.create({
        data: {
          userId: req.userId,
          type: req.type,
          punchTime: req.punchTime,
          latitude: 0,
          longitude: 0,
          address: "补卡",
          source: "makeup",
        },
      }),
      this.prisma.attendanceMakeupRequest.update({
        where: { id: requestId },
        data: {
          status: "approved",
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
        include: this.includeUser(),
      }),
    ])

    return this.serializeRequest(updated)
  }

  async reject(requestId: string, adminId: string, rejectReason: string) {
    const req = await this.prisma.attendanceMakeupRequest.findUnique({
      where: { id: requestId },
    })
    if (!req) throw new NotFoundException("补卡申请不存在")
    if (req.status !== "pending") {
      throw new BadRequestException("该申请已处理")
    }

    const updated = await this.prisma.attendanceMakeupRequest.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectReason: rejectReason.trim(),
      },
      include: this.includeUser(),
    })
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

    await this.assertAdminMakeupSlotAvailable(dto.userId, dto.date, type)

    const punchTime = dayjs(
      `${dto.date} ${dto.time}`,
      "YYYY-MM-DD HH:mm",
      true
    )
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

      return await tx.attendanceRecord.create({
        data: {
          userId: dto.userId,
          type,
          punchTime: punchTime.toDate(),
          latitude: 0,
          longitude: 0,
          address: "补卡",
          source: "makeup",
        },
      })
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
