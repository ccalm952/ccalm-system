import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common"
import { OrthodonticsCategory, type Prisma } from "@prisma/client"
import dayjs from "dayjs"

import { PrismaService } from "../../prisma/prisma.service"
import {
  CreateOrthodonticsPatientDto,
  UpdateOrthodonticsPatientDto,
} from "./dto/orthodontics-patient.dto"

type SeedRow = {
  category: string
  chartNo?: string
  name: string
  phone?: string
  applianceModel?: string
  lastVisitDate?: string | null
  followUp?: string
  remark?: string
  doctor?: string
}

const CATEGORY_SET = new Set<string>(Object.values(OrthodonticsCategory))

@Injectable()
export class OrthodonticsService implements OnModuleInit {
  private readonly logger = new Logger(OrthodonticsService.name)
  private seedPromise: Promise<void> | null = null

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.ensureSeeded()
  }

  private parseCategory(raw?: string): OrthodonticsCategory {
    if (!raw || !CATEGORY_SET.has(raw)) {
      throw new BadRequestException("无效的正畸分类")
    }
    return raw as OrthodonticsCategory
  }

  private normalizeDate(raw?: string | null): string | null {
    if (raw == null) return null
    const s = String(raw).trim()
    if (!s) return null
    const d = dayjs(s)
    if (!d.isValid()) {
      throw new BadRequestException("上次就诊时间格式无效")
    }
    return d.format("YYYY-MM-DD")
  }

  private daysSince(lastVisitDate: string | null): number | null {
    if (!lastVisitDate) return null
    const d = dayjs(lastVisitDate)
    if (!d.isValid()) return null
    return dayjs().startOf("day").diff(d.startOf("day"), "day")
  }

  private mapRow(row: {
    id: number
    category: OrthodonticsCategory
    chartNo: string
    name: string
    phone: string
    applianceModel: string
    lastVisitDate: string | null
    followUp: string
    remark: string
    doctor: string
    createdAt: Date
    updatedAt: Date
  }) {
    return {
      id: row.id,
      category: row.category,
      chartNo: row.chartNo,
      name: row.name,
      phone: row.phone,
      applianceModel: row.applianceModel,
      lastVisitDate: row.lastVisitDate,
      daysSinceLastVisit: this.daysSince(row.lastVisitDate),
      followUp: row.followUp,
      remark: row.remark,
      doctor: row.doctor,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async ensureSeeded() {
    if (!this.seedPromise) {
      this.seedPromise = this.seedIfEmpty().catch((err: unknown) => {
        this.seedPromise = null
        throw err
      })
    }
    await this.seedPromise
  }

  private async seedIfEmpty() {
    const count = await this.prisma.orthodonticsPatient.count()
    if (count > 0) return

    const seedPath = join(process.cwd(), "prisma/data/orthodontics-seed.json")
    let rows: SeedRow[]
    try {
      rows = JSON.parse(readFileSync(seedPath, "utf8")) as SeedRow[]
    } catch (err) {
      this.logger.warn(`正畸种子数据读取失败：${String(err)}`)
      return
    }
    if (!Array.isArray(rows) || rows.length === 0) return

    const data: Prisma.OrthodonticsPatientCreateManyInput[] = []
    for (const row of rows) {
      if (!row?.name?.trim()) continue
      if (!CATEGORY_SET.has(row.category)) continue
      let lastVisitDate: string | null = null
      if (row.lastVisitDate) {
        const d = dayjs(row.lastVisitDate)
        lastVisitDate = d.isValid() ? d.format("YYYY-MM-DD") : null
      }
      data.push({
        category: row.category as OrthodonticsCategory,
        chartNo: row.chartNo?.trim() ?? "",
        name: row.name.trim(),
        phone: row.phone?.trim() ?? "",
        applianceModel: row.applianceModel?.trim() ?? "",
        lastVisitDate,
        followUp: row.followUp?.trim() ?? "",
        remark: row.remark?.trim() ?? "",
        doctor: row.doctor?.trim() ?? "",
      })
    }
    if (!data.length) return
    await this.prisma.orthodonticsPatient.createMany({ data })
    this.logger.log(`已导入正畸种子数据 ${data.length} 条`)
  }

  async list(categoryRaw: string, q?: string) {
    await this.ensureSeeded()
    const category = this.parseCategory(categoryRaw)
    const keyword = q?.trim()
    const rows = await this.prisma.orthodonticsPatient.findMany({
      where: {
        category,
        ...(keyword
          ? {
              OR: [
                { name: { contains: keyword, mode: "insensitive" } },
                { phone: { contains: keyword } },
                { chartNo: { contains: keyword, mode: "insensitive" } },
                { doctor: { contains: keyword, mode: "insensitive" } },
                { remark: { contains: keyword, mode: "insensitive" } },
                { followUp: { contains: keyword, mode: "insensitive" } },
                { applianceModel: { contains: keyword, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastVisitDate: "asc" }, { id: "asc" }],
    })
    return rows.map((row) => this.mapRow(row))
  }

  async create(dto: CreateOrthodonticsPatientDto) {
    await this.ensureSeeded()
    const name = dto.name.trim()
    if (!name) throw new BadRequestException("请填写姓名")
    const category = this.parseCategory(dto.category)
    const row = await this.prisma.orthodonticsPatient.create({
      data: {
        category,
        name,
        chartNo: dto.chartNo?.trim() ?? "",
        phone: dto.phone?.trim() ?? "",
        applianceModel: dto.applianceModel?.trim() ?? "",
        lastVisitDate: this.normalizeDate(dto.lastVisitDate),
        followUp: dto.followUp?.trim() ?? "",
        remark: dto.remark?.trim() ?? "",
        doctor: dto.doctor?.trim() ?? "",
      },
    })
    return this.mapRow(row)
  }

  async update(id: number, dto: UpdateOrthodonticsPatientDto) {
    const existing = await this.prisma.orthodonticsPatient.findUnique({
      where: { id },
    })
    if (!existing) throw new NotFoundException("记录不存在")
    const name = dto.name.trim()
    if (!name) throw new BadRequestException("请填写姓名")
    const row = await this.prisma.orthodonticsPatient.update({
      where: { id },
      data: {
        name,
        chartNo: dto.chartNo?.trim() ?? "",
        phone: dto.phone?.trim() ?? "",
        applianceModel: dto.applianceModel?.trim() ?? "",
        lastVisitDate: this.normalizeDate(dto.lastVisitDate),
        followUp: dto.followUp?.trim() ?? "",
        remark: dto.remark?.trim() ?? "",
        doctor: dto.doctor?.trim() ?? "",
      },
    })
    return this.mapRow(row)
  }

  async remove(id: number) {
    const existing = await this.prisma.orthodonticsPatient.findUnique({
      where: { id },
    })
    if (!existing) throw new NotFoundException("记录不存在")
    await this.prisma.orthodonticsPatient.delete({ where: { id } })
    return { ok: true }
  }
}
