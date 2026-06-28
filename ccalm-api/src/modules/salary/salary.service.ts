import { Injectable, NotFoundException } from "@nestjs/common"
import type { Prisma } from "@prisma/client"
import dayjs from "dayjs"

import { PrismaService } from "../../prisma/prisma.service"
import type { SaveSalarySheetDto } from "./dto/save-salary-sheet.dto"

function allowedSalaryMonths(now = dayjs()): Set<string> {
  const lastYear = now.year() - 1
  const thisYear = now.year()
  const months = new Set<string>()
  for (let m = 1; m <= 12; m += 1) {
    months.add(`${lastYear}-${String(m).padStart(2, "0")}`)
  }
  const endMonth = now.month() + 1
  for (let m = 1; m <= endMonth; m += 1) {
    months.add(`${thisYear}-${String(m).padStart(2, "0")}`)
  }
  return months
}

@Injectable()
export class SalaryService {
  constructor(private readonly prisma: PrismaService) {}

  async listMonths(): Promise<string[]> {
    const allowed = allowedSalaryMonths()
    const rows = await this.prisma.salarySheet.findMany({
      select: { month: true },
      orderBy: { month: "asc" },
    })
    const stored = rows.map((r) => r.month).filter((m) => allowed.has(m))
    for (const month of allowed) {
      if (!stored.includes(month)) stored.push(month)
    }
    return stored.sort()
  }

  async getMonth(month: string) {
    if (!allowedSalaryMonths().has(month)) {
      throw new NotFoundException("该月份不在可查看范围内")
    }
    const row = await this.prisma.salarySheet.findUnique({ where: { month } })
    if (!row) throw new NotFoundException("该月份薪资表不存在")
    return {
      month: row.month,
      data: row.data,
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async saveMonth(dto: SaveSalarySheetDto) {
    if (!allowedSalaryMonths().has(dto.month)) {
      throw new NotFoundException("该月份不在可保存范围内")
    }
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
}
