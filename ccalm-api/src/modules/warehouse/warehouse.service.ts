import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import dayjs from "dayjs"

import { PrismaService } from "../../prisma/prisma.service"
import type {
  CreateWarehouseItemDto,
  CreateWarehouseTxnDto,
  UpdateWarehouseItemDto,
} from "./dto/warehouse.dto"

function cleanText(value?: string, fallback = ""): string {
  return value?.trim() || fallback
}

function requireDate(value: string): string {
  const d = dayjs(value, "YYYY-MM-DD", true)
  if (!d.isValid()) throw new BadRequestException("日期格式不合法")
  return d.format("YYYY-MM-DD")
}

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  async listItems(q?: string) {
    const keyword = q?.trim()
    return await this.prisma.warehouseItem.findMany({
      where: keyword
        ? {
            OR: [
              { code: { contains: keyword, mode: "insensitive" } },
              { name: { contains: keyword, mode: "insensitive" } },
              { category: { contains: keyword, mode: "insensitive" } },
              { brand: { contains: keyword, mode: "insensitive" } },
              { spec: { contains: keyword, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [
        { enabled: "desc" },
        { category: "asc" },
        { name: "asc" },
        { id: "asc" },
      ],
    })
  }

  async createItem(dto: CreateWarehouseItemDto) {
    const code = cleanText(dto.code)
    const name = cleanText(dto.name)
    if (!code || !name) throw new BadRequestException("编码与名称不能为空")

    return await this.prisma.warehouseItem.create({
      data: {
        code,
        name,
        category: cleanText(dto.category, "其他"),
        spec: cleanText(dto.spec),
        unit: cleanText(dto.unit, "个"),
        brand: cleanText(dto.brand),
        manufacturer: cleanText(dto.manufacturer),
        supplierName: cleanText(dto.supplierName),
        enabled: dto.enabled ?? true,
      },
    })
  }

  async updateItem(id: number, dto: UpdateWarehouseItemDto) {
    const existing = await this.prisma.warehouseItem.findUnique({
      where: { id },
    })
    if (!existing) throw new NotFoundException("物料不存在")

    const data = {
      ...(dto.code != null ? { code: cleanText(dto.code) } : {}),
      ...(dto.name != null ? { name: cleanText(dto.name) } : {}),
      ...(dto.category != null
        ? { category: cleanText(dto.category, "其他") }
        : {}),
      ...(dto.spec != null ? { spec: cleanText(dto.spec) } : {}),
      ...(dto.unit != null ? { unit: cleanText(dto.unit, "个") } : {}),
      ...(dto.brand != null ? { brand: cleanText(dto.brand) } : {}),
      ...(dto.manufacturer != null
        ? { manufacturer: cleanText(dto.manufacturer) }
        : {}),
      ...(dto.supplierName != null
        ? { supplierName: cleanText(dto.supplierName) }
        : {}),
      ...(typeof dto.enabled === "boolean" ? { enabled: dto.enabled } : {}),
    }

    if ("code" in data && !data.code)
      throw new BadRequestException("编码不能为空")
    if ("name" in data && !data.name)
      throw new BadRequestException("名称不能为空")

    return await this.prisma.warehouseItem.update({
      where: { id },
      data,
    })
  }

  async deleteItem(id: number) {
    const count = await this.prisma.warehouseTxn.count({
      where: { itemId: id },
    })
    if (count > 0) {
      throw new BadRequestException("已有出入库流水的物料不能删除")
    }
    await this.prisma.warehouseItem.delete({ where: { id } })
    return { ok: true }
  }

  async createTxn(dto: CreateWarehouseTxnDto, operatorUserId: string) {
    const occurDate = requireDate(dto.occurDate)
    const item = await this.prisma.warehouseItem.findUnique({
      where: { id: dto.itemId },
    })
    if (!item) throw new NotFoundException("物料不存在")
    if (!item.enabled)
      throw new BadRequestException("物料已停用，不能继续出入库")

    const qtyDelta = dto.type === "out" ? -dto.qty : dto.qty
    const nextQty = item.currentQty + qtyDelta
    if (nextQty < 0) throw new BadRequestException("出库后库存不能为负数")

    const amount = Number((dto.qty * dto.unitPrice).toFixed(2))

    await this.prisma.$transaction(async (tx) => {
      await tx.warehouseTxn.create({
        data: {
          itemId: dto.itemId,
          type: dto.type,
          bizType: dto.bizType,
          qty: dto.qty,
          unitPrice: dto.unitPrice,
          amount,
          occurDate,
          remark: cleanText(dto.remark),
          operatorUserId,
        },
      })

      await tx.warehouseItem.update({
        where: { id: dto.itemId },
        data: {
          currentQty: nextQty,
          ...(dto.type === "in" && dto.bizType === "purchase"
            ? { lastPurchasePrice: dto.unitPrice }
            : {}),
        },
      })
    })

    return { ok: true }
  }

  async listTxns(filters: {
    month?: string
    type?: "in" | "out" | "adjust"
    itemId?: number
  }) {
    const month = filters.month?.trim()
    if (month && !dayjs(`${month}-01`, "YYYY-MM-DD", true).isValid()) {
      throw new BadRequestException("月份格式不合法")
    }

    return await this.prisma.warehouseTxn.findMany({
      where: {
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.itemId ? { itemId: filters.itemId } : {}),
        ...(month
          ? {
              occurDate: {
                gte: `${month}-01`,
                lte: dayjs(`${month}-01`).endOf("month").format("YYYY-MM-DD"),
              },
            }
          : {}),
      },
      include: {
        item: true,
        operatorUser: {
          select: { displayName: true, username: true },
        },
      },
      orderBy: [{ occurDate: "desc" }, { id: "desc" }],
      take: 200,
    })
  }

  async purchaseStats(month?: string) {
    const targetMonth = cleanText(month, dayjs().format("YYYY-MM"))
    if (!dayjs(`${targetMonth}-01`, "YYYY-MM-DD", true).isValid()) {
      throw new BadRequestException("月份格式不合法")
    }

    const txns = await this.prisma.warehouseTxn.findMany({
      where: {
        type: "in",
        bizType: "purchase",
        occurDate: {
          gte: `${targetMonth}-01`,
          lte: dayjs(`${targetMonth}-01`).endOf("month").format("YYYY-MM-DD"),
        },
      },
      include: { item: true },
      orderBy: [{ amount: "desc" }, { id: "desc" }],
    })

    const byItemMap = new Map<
      number,
      {
        itemId: number
        code: string
        name: string
        spec: string
        unit: string
        qty: number
        amount: number
      }
    >()

    let totalAmount = 0
    let totalQty = 0
    for (const txn of txns) {
      totalAmount += txn.amount
      totalQty += txn.qty
      const prev = byItemMap.get(txn.itemId) ?? {
        itemId: txn.itemId,
        code: txn.item.code,
        name: txn.item.name,
        spec: txn.item.spec,
        unit: txn.item.unit,
        qty: 0,
        amount: 0,
      }
      prev.qty += txn.qty
      prev.amount += txn.amount
      byItemMap.set(txn.itemId, prev)
    }

    const byItem = [...byItemMap.values()].sort((a, b) => b.amount - a.amount)

    return {
      month: targetMonth,
      totalAmount: Number(totalAmount.toFixed(2)),
      totalQty,
      txnCount: txns.length,
      byItem,
    }
  }
}
