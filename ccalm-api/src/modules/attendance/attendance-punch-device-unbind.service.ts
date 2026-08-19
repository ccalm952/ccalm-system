import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { PrismaService } from "../../prisma/prisma.service"
import { MakeupEventsService } from "./makeup-events.service"

@Injectable()
export class AttendancePunchDeviceUnbindService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly makeupEvents: MakeupEventsService
  ) {}

  private includeUser() {
    return {
      user: { select: { displayName: true, username: true } },
      reviewer: { select: { displayName: true, username: true } },
    } as const
  }

  private serialize(row: {
    id: string
    userId: string
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
      status: row.status,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      reviewerName: row.reviewer
        ? row.reviewer.displayName || row.reviewer.username
        : null,
    }
  }

  async createRequest(userId: string) {
    const bound = await this.prisma.attendancePunchDevice.findUnique({
      where: { userId },
    })
    if (!bound) {
      throw new BadRequestException("尚未绑定打卡设备，无需解绑")
    }

    const pending =
      await this.prisma.attendancePunchDeviceUnbindRequest.findFirst({
        where: { userId, status: "pending" },
      })
    if (pending) {
      throw new BadRequestException("已有解绑申请审批中")
    }

    const row = await this.prisma.attendancePunchDeviceUnbindRequest.create({
      data: { userId },
      include: this.includeUser(),
    })
    this.makeupEvents.publish({
      type: "device-unbind-changed",
      action: "created",
      userId,
      requestId: row.id,
    })
    return this.serialize(row)
  }

  async listMine(userId: string, status?: string) {
    const rows = await this.prisma.attendancePunchDeviceUnbindRequest.findMany({
      where: {
        userId,
        status:
          status === "pending"
            ? "pending"
            : status === "approved"
              ? "approved"
              : status === "rejected"
                ? "rejected"
                : undefined,
      },
      orderBy: [{ createdAt: "desc" }],
      include: this.includeUser(),
    })
    return rows.map((row) => this.serialize(row))
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

    const rows = await this.prisma.attendancePunchDeviceUnbindRequest.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: this.includeUser(),
    })
    return rows.map((row) => this.serialize(row))
  }

  async approve(requestId: string, adminId: string) {
    const req = await this.prisma.attendancePunchDeviceUnbindRequest.findUnique(
      {
        where: { id: requestId },
      }
    )
    if (!req) throw new NotFoundException("解绑申请不存在")
    if (req.status !== "pending") {
      throw new BadRequestException("该申请已处理")
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.attendancePunchDeviceUnbindRequest.updateMany({
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

      await tx.attendancePunchDevice.deleteMany({
        where: { userId: req.userId },
      })

      const row = await tx.attendancePunchDeviceUnbindRequest.findUnique({
        where: { id: requestId },
        include: this.includeUser(),
      })
      if (!row) throw new NotFoundException("解绑申请不存在")
      return row
    })

    this.makeupEvents.publish({
      type: "device-unbind-changed",
      action: "approved",
      userId: req.userId,
      requestId,
    })
    return this.serialize(updated)
  }

  async reject(requestId: string, adminId: string) {
    const req = await this.prisma.attendancePunchDeviceUnbindRequest.findUnique(
      {
        where: { id: requestId },
      }
    )
    if (!req) throw new NotFoundException("解绑申请不存在")

    const { count } =
      await this.prisma.attendancePunchDeviceUnbindRequest.updateMany({
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

    const row = await this.prisma.attendancePunchDeviceUnbindRequest.findUnique(
      {
        where: { id: requestId },
        include: this.includeUser(),
      }
    )
    if (!row) throw new NotFoundException("解绑申请不存在")

    this.makeupEvents.publish({
      type: "device-unbind-changed",
      action: "rejected",
      userId: req.userId,
      requestId,
    })
    return this.serialize(row)
  }
}
