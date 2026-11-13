import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { isPrismaUniqueViolation } from "../../common/prisma-errors";
import { PrismaService } from "../../prisma/prisma.service";
import { roundMoney } from "../charges/charge-calc";
import { SaveFeeCategoryDto, SaveFeeItemDto } from "./dto/fee-catalog.dto";

@Injectable()
export class FeeCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.feeCategory.findMany({
      include: {
        items: { orderBy: [{ sort: "asc" }, { id: "asc" }] },
      },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
    });
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      items: c.items.map((i) => ({
        id: i.id,
        categoryId: i.categoryId,
        name: i.name,
        price: i.price,
      })),
    }));
  }

  async createCategory(dto: SaveFeeCategoryDto) {
    const last = await this.prisma.feeCategory.aggregate({
      _max: { sort: true },
    });
    try {
      return await this.prisma.feeCategory.create({
        data: { name: dto.name.trim(), sort: (last._max.sort ?? 0) + 1 },
      });
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new BadRequestException("分类名称已存在");
      }
      throw error;
    }
  }

  async updateCategory(id: number, dto: SaveFeeCategoryDto) {
    await this.findCategory(id);
    try {
      return await this.prisma.feeCategory.update({
        where: { id },
        data: { name: dto.name.trim() },
      });
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new BadRequestException("分类名称已存在");
      }
      throw error;
    }
  }

  async removeCategory(id: number) {
    await this.findCategory(id);
    const count = await this.prisma.feeItem.count({
      where: { categoryId: id },
    });
    if (count > 0) {
      throw new BadRequestException("请先删除该分类下的项目");
    }
    await this.prisma.feeCategory.delete({ where: { id } });
    return { ok: true };
  }

  async createItem(dto: SaveFeeItemDto) {
    await this.findCategory(dto.categoryId);
    const last = await this.prisma.feeItem.aggregate({
      where: { categoryId: dto.categoryId },
      _max: { sort: true },
    });
    try {
      return await this.prisma.feeItem.create({
        data: {
          categoryId: dto.categoryId,
          name: dto.name.trim(),
          price: roundMoney(dto.price),
          sort: (last._max.sort ?? 0) + 1,
        },
      });
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new BadRequestException("该分类下已有同名项目");
      }
      throw error;
    }
  }

  async updateItem(id: number, dto: SaveFeeItemDto) {
    await this.findItem(id);
    await this.findCategory(dto.categoryId);
    try {
      return await this.prisma.feeItem.update({
        where: { id },
        data: {
          categoryId: dto.categoryId,
          name: dto.name.trim(),
          price: roundMoney(dto.price),
        },
      });
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new BadRequestException("该分类下已有同名项目");
      }
      throw error;
    }
  }

  async removeItem(id: number) {
    await this.findItem(id);
    await this.prisma.feeItem.delete({ where: { id } });
    return { ok: true };
  }

  private async findCategory(id: number) {
    const category = await this.prisma.feeCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException("分类不存在");
    return category;
  }

  private async findItem(id: number) {
    const item = await this.prisma.feeItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("收费项目不存在");
    return item;
  }
}
