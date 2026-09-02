import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { OrthodonticsCategory } from "@prisma/client"
import dayjs from "dayjs"

import { PrismaService } from "../../prisma/prisma.service"
import {
  CreateOrthodonticsPatientDto,
  UpdateOrthodonticsPatientDto,
} from "./dto/orthodontics-patient.dto"

const CATEGORY_SET = new Set<string>(Object.values(OrthodonticsCategory))

@Injectable()
export class OrthodonticsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async list(categoryRaw: string, q?: string) {
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
        ...(dto.category != null
          ? { category: this.parseCategory(dto.category) }
          : {}),
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
