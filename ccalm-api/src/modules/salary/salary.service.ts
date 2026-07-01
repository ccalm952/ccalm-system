import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import type { Prisma } from "@prisma/client"
import dayjs from "dayjs"

import { PrismaService } from "../../prisma/prisma.service"
import type { SaveSalarySheetDto } from "./dto/save-salary-sheet.dto"

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
    return {
      month: row.month,
      data: row.data,
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async saveMonth(dto: SaveSalarySheetDto) {
    assertValidMonth(dto.month)
    const row = await this.prisma.salarySheet.upsert({
      where: { month: dto.month },
      create: {
        month: dto.month,
        data: dto.data as Prisma.InputJsonValue,
      },
      update: {
        data: dto.data as Prisma.InputJsonValue,
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
}
