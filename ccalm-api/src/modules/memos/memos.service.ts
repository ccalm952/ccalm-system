import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"

import { PrismaService } from "../../prisma/prisma.service"
import { CreateMemoDto, UpdateMemoDto } from "./dto/memo.dto"

@Injectable()
export class MemosService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: {
    id: number
    title: string
    content: string
    category: string
    pinned: boolean
    createdAt: Date
    updatedAt: Date
  }) {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      pinned: row.pinned,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }

  async list() {
    const rows = await this.prisma.memo.findMany({
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    })
    return rows.map((row) => this.mapRow(row))
  }

  async create(dto: CreateMemoDto) {
    const title = dto.title.trim()
    if (!title) throw new BadRequestException("标题不能为空")
    const row = await this.prisma.memo.create({
      data: {
        title,
        content: dto.content?.trim() ?? "",
        category: dto.category?.trim() ?? "",
        pinned: dto.pinned ?? false,
      },
    })
    return this.mapRow(row)
  }

  async update(id: number, dto: UpdateMemoDto) {
    const existing = await this.prisma.memo.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException("备忘录不存在")

    if (dto.title !== undefined && !dto.title.trim()) {
      throw new BadRequestException("标题不能为空")
    }

    const row = await this.prisma.memo.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.content !== undefined && { content: dto.content.trim() }),
        ...(dto.category !== undefined && { category: dto.category.trim() }),
        ...(dto.pinned !== undefined && { pinned: dto.pinned }),
      },
    })
    return this.mapRow(row)
  }

  async remove(id: number) {
    const existing = await this.prisma.memo.findUnique({ where: { id } })
    if (!existing) throw new NotFoundException("备忘录不存在")
    await this.prisma.memo.delete({ where: { id } })
    return { ok: true }
  }
}
