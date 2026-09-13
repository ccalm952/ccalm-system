import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import type { Prisma } from "@prisma/client"
import dayjs from "dayjs"

import { PrismaService } from "../../prisma/prisma.service"
import { stripLegacySalarySheet } from "./salary-sheet-sanitize"

function assertValidMonth(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new BadRequestException("月份格式应为 YYYY-MM")
  }
  if (!dayjs(`${month}-01`, "YYYY-MM-DD", true).isValid()) {
    throw new BadRequestException("月份不合法")
  }
}

@Injectable()
export class SalaryService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitizeSheetData(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    return stripLegacySalarySheet(data)
  }

  async listMonths(): Promise<string[]> {
    const rows = await this.prisma.salarySheet.findMany({
      select: { month: true },
      orderBy: { month: "asc" },
    })
    return rows.map((r) => r.month)
  }

  async getMonth(month: string) {
    assertValidMonth(month)
    const row = await this.prisma.salarySheet.findUnique({ where: { month } })
    if (!row) throw new NotFoundException("该月份薪资表不存在")
    const data = this.sanitizeSheetData(row.data as Record<string, unknown>)
    return {
      month: row.month,
      data,
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async saveMonth(dto: { month: string; data: Record<string, unknown> }) {
    assertValidMonth(dto.month)
    const data = this.sanitizeSheetData(dto.data)
    const row = await this.prisma.salarySheet.upsert({
      where: { month: dto.month },
      create: {
        month: dto.month,
        data: data as Prisma.InputJsonValue,
      },
      update: {
        data: data as Prisma.InputJsonValue,
      },
    })
    return {
      month: row.month,
      data: row.data,
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async deleteMonth(month: string) {
    assertValidMonth(month)
    const row = await this.prisma.salarySheet.findUnique({ where: { month } })
    if (!row) throw new NotFoundException("该月份薪资表不存在")
    await this.prisma.salarySheet.delete({ where: { month } })
    return { ok: true }
  }

  async getDefaultTemplate() {
    const row = await this.prisma.salaryDefaultTemplate.findUnique({
      where: { id: "global" },
    })
    if (!row) {
      return {
        data: null,
        updatedAt: null,
      }
    }
    const data = this.sanitizeSheetData(row.data as Record<string, unknown>)
    return {
      data,
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async saveDefaultTemplate(data: Record<string, unknown>) {
    const cleaned = this.sanitizeSheetData(data)
    const row = await this.prisma.salaryDefaultTemplate.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        data: cleaned as Prisma.InputJsonValue,
      },
      update: {
        data: cleaned as Prisma.InputJsonValue,
      },
    })
    return {
      data: row.data,
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async getGlobalSettings() {
    const row = await this.prisma.salarySettings.findUnique({
      where: { id: "global" },
    })
    return {
      data: row?.data ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    }
  }

  async saveGlobalSettings(data: Record<string, unknown>) {
    const row = await this.prisma.salarySettings.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        data: data as Prisma.InputJsonValue,
      },
      update: {
        data: data as Prisma.InputJsonValue,
      },
    })
    return {
      data: row.data,
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}
