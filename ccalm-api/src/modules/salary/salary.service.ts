import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common"
import type { Prisma } from "@prisma/client"
import dayjs from "dayjs"

import { PrismaService } from "../../prisma/prisma.service"
import type { SaveSalarySheetDto } from "./dto/save-salary-sheet.dto"
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
export class SalaryService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.stripLegacyStoredData()
  }

  private sanitizeSheetData(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    return stripLegacySalarySheet(data)
  }

  private sheetDataChanged(
    before: unknown,
    after: Record<string, unknown>
  ): boolean {
    return JSON.stringify(before) !== JSON.stringify(after)
  }

  async stripLegacyStoredData() {
    const sheets = await this.prisma.salarySheet.findMany()
    for (const sheet of sheets) {
      const cleaned = this.sanitizeSheetData(
        sheet.data as Record<string, unknown>
      )
      if (!this.sheetDataChanged(sheet.data, cleaned)) continue
      await this.prisma.salarySheet.update({
        where: { month: sheet.month },
        data: { data: cleaned as Prisma.InputJsonValue },
      })
    }

    const template = await this.prisma.salaryDefaultTemplate.findUnique({
      where: { id: "global" },
    })
    if (template) {
      const cleaned = this.sanitizeSheetData(
        template.data as Record<string, unknown>
      )
      if (this.sheetDataChanged(template.data, cleaned)) {
        await this.prisma.salaryDefaultTemplate.update({
          where: { id: "global" },
          data: { data: cleaned as Prisma.InputJsonValue },
        })
      }
    }
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

  async saveMonth(dto: SaveSalarySheetDto) {
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
