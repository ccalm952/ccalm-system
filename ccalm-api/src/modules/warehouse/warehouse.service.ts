import { Prisma } from "@prisma/client"
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import dayjs from "dayjs"

import { isPrismaUniqueViolation } from "../../common/prisma-errors"
import { PrismaService } from "../../prisma/prisma.service"
import type {
  CreateWarehouseItemDto,
  CreateWarehouseTxnDto,
  UpdateWarehouseItemDto,
} from "./dto/warehouse.dto"
import {
  lichiItemCode,
  LICHI_SUPPLIER,
  parseLichiExcel,
  type LichiImportResult,
} from "./warehouse-lichi-import"

function cleanText(value?: string, fallback = ""): string {
  return value?.trim() || fallback
}

function requireDate(value: string): string {
  const d = dayjs(value, "YYYY-MM-DD", true)
  if (!d.isValid()) throw new BadRequestException("日期格式不合法")
  return d.format("YYYY-MM-DD")
}

function txnQtyDelta(
  type: "in" | "out" | "adjust",
  bizType: string,
  qty: number
): number {
  if (type === "out" || bizType === "adjust_out") return -qty
  return qty
}

function resolveTxnDateRange(filters: {
  month?: string
  startDate?: string
  endDate?: string
}): { gte: string; lte: string } | undefined {
  const startDate = filters.startDate?.trim()
  const endDate = filters.endDate?.trim()

  if (startDate || endDate) {
    if (startDate) requireDate(startDate)
    if (endDate) requireDate(endDate)
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException("开始日期不能晚于结束日期")
    }
    const gte = startDate ?? endDate!
    const lte = endDate ?? startDate!
    return { gte, lte }
  }

  const month = filters.month?.trim()
  if (!month) return undefined
  if (!dayjs(`${month}-01`, "YYYY-MM-DD", true).isValid()) {
    throw new BadRequestException("月份格式不合法")
  }
  return {
    gte: `${month}-01`,
    lte: dayjs(`${month}-01`).endOf("month").format("YYYY-MM-DD"),
  }
}

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  private async lockWarehouseItem(
    tx: Prisma.TransactionClient,
    itemId: number
  ) {
    const rows = await tx.$queryRaw<
      Array<{ id: number; currentQty: number; enabled: boolean }>
    >`
      SELECT id, "currentQty", enabled
      FROM "WarehouseItem"
      WHERE id = ${itemId}
      FOR UPDATE
    `
    const item = rows[0]
    if (!item) throw new NotFoundException("物料不存在")
    return item
  }

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

    const duplicated = await this.prisma.warehouseItem.findUnique({
      where: { code },
    })
    if (duplicated) throw new BadRequestException("编码已存在")

    try {
      return await this.prisma.warehouseItem.create({
        data: {
          code,
          name,
          category: cleanText(dto.category),
          spec: cleanText(dto.spec),
          unit: cleanText(dto.unit, "个"),
          brand: cleanText(dto.brand),
          manufacturer: cleanText(dto.manufacturer),
          supplierName: cleanText(dto.supplierName),
          enabled: dto.enabled ?? true,
        },
      })
    } catch (error) {
      if (isPrismaUniqueViolation(error)) {
        throw new BadRequestException("编码已存在")
      }
      throw error
    }
  }

  async updateItem(
    id: number,
    dto: UpdateWarehouseItemDto,
    operatorUserId: string
  ) {
    const existing = await this.prisma.warehouseItem.findUnique({
      where: { id },
    })
    if (!existing) throw new NotFoundException("物料不存在")

    const data = {
      ...(dto.code != null ? { code: cleanText(dto.code) } : {}),
      ...(dto.name != null ? { name: cleanText(dto.name) } : {}),
      ...(dto.category != null ? { category: cleanText(dto.category) } : {}),
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

    if ("code" in data && data.code) {
      const duplicated = await this.prisma.warehouseItem.findFirst({
        where: { code: data.code, NOT: { id } },
      })
      if (duplicated) throw new BadRequestException("编码已存在")
    }

    await this.prisma.$transaction(async (tx) => {
      const locked = await this.lockWarehouseItem(tx, id)
      const nextQty =
        dto.currentQty != null ? Math.round(dto.currentQty) : locked.currentQty
      if (nextQty < 0) throw new BadRequestException("库存不能为负数")

      const qtyDelta = nextQty - locked.currentQty

      if (qtyDelta !== 0) {
        await tx.warehouseTxn.create({
          data: {
            itemId: id,
            type: "adjust",
            bizType: qtyDelta > 0 ? "adjust_in" : "adjust_out",
            qty: Math.abs(qtyDelta),
            unitPrice: 0,
            amount: 0,
            occurDate: dayjs().format("YYYY-MM-DD"),
            operatorUserId,
          },
        })
      }

      await tx.warehouseItem.update({
        where: { id },
        data: {
          ...data,
          ...(dto.currentQty != null ? { currentQty: nextQty } : {}),
        },
      })
    })

    return await this.prisma.warehouseItem.findUnique({ where: { id } })
  }

  async deleteItem(id: number) {
    const item = await this.prisma.warehouseItem.findUnique({
      where: { id },
    })
    if (!item) throw new NotFoundException("物料不存在")

    await this.prisma.$transaction(async (tx) => {
      await tx.warehouseTxn.deleteMany({ where: { itemId: id } })
      await tx.warehouseItem.delete({ where: { id } })
    })

    return { ok: true }
  }

  async createTxn(dto: CreateWarehouseTxnDto, operatorUserId: string) {
    const occurDate = requireDate(dto.occurDate)

    await this.prisma.$transaction(async (tx) => {
      const item = await this.lockWarehouseItem(tx, dto.itemId)
      if (!item.enabled)
        throw new BadRequestException("物料已停用，不能继续出入库")

      const qtyDelta = txnQtyDelta(dto.type, dto.bizType, dto.qty)
      const nextQty = item.currentQty + qtyDelta
      if (nextQty < 0) throw new BadRequestException("出库后库存不能为负数")

      const amount = Number((dto.qty * dto.unitPrice).toFixed(2))

      await tx.warehouseTxn.create({
        data: {
          itemId: dto.itemId,
          type: dto.type,
          bizType: dto.bizType,
          qty: dto.qty,
          unitPrice: dto.unitPrice,
          amount,
          occurDate,
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

  async deleteTxn(id: number) {
    await this.prisma.$transaction(async (tx) => {
      const txn = await tx.warehouseTxn.findUnique({
        where: { id },
      })
      if (!txn) throw new NotFoundException("流水不存在")

      const item = await this.lockWarehouseItem(tx, txn.itemId)
      const qtyDelta = txnQtyDelta(txn.type, txn.bizType, txn.qty)
      const nextQty = item.currentQty - qtyDelta
      if (nextQty < 0) {
        throw new BadRequestException("删除后库存不能为负数")
      }

      await tx.warehouseTxn.delete({ where: { id } })

      const latestPurchase = await tx.warehouseTxn.findFirst({
        where: {
          itemId: txn.itemId,
          type: "in",
          bizType: "purchase",
        },
        orderBy: [{ occurDate: "desc" }, { id: "desc" }],
      })

      await tx.warehouseItem.update({
        where: { id: txn.itemId },
        data: {
          currentQty: nextQty,
          ...(txn.type === "in" && txn.bizType === "purchase"
            ? { lastPurchasePrice: latestPurchase?.unitPrice ?? 0 }
            : {}),
        },
      })
    })

    return { ok: true }
  }

  async listTxns(filters: {
    month?: string
    startDate?: string
    endDate?: string
    type?: "in" | "out" | "adjust"
    itemId?: number
    page?: number
    pageSize?: number
  }) {
    const occurDate = resolveTxnDateRange(filters)
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 15))
    const where = {
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.itemId ? { itemId: filters.itemId } : {}),
      ...(occurDate ? { occurDate } : {}),
    }

    const [total, items] = await Promise.all([
      this.prisma.warehouseTxn.count({ where }),
      this.prisma.warehouseTxn.findMany({
        where,
        include: {
          item: true,
          operatorUser: {
            select: { displayName: true, username: true },
          },
        },
        orderBy: [{ occurDate: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return { items, total, page, pageSize }
  }

  async purchaseStats(filters: {
    month?: string
    startDate?: string
    endDate?: string
  }) {
    const occurDate =
      resolveTxnDateRange(filters) ??
      resolveTxnDateRange({ month: dayjs().format("YYYY-MM") })!

    const txns = await this.prisma.warehouseTxn.findMany({
      where: {
        type: "in",
        bizType: "purchase",
        occurDate,
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
        unitPrice: number
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
        unitPrice: 0,
        amount: 0,
      }
      prev.qty += txn.qty
      prev.amount += txn.amount
      prev.unitPrice =
        prev.qty > 0 ? Number((prev.amount / prev.qty).toFixed(2)) : 0
      byItemMap.set(txn.itemId, prev)
    }

    const byItem = [...byItemMap.values()].sort((a, b) => b.amount - a.amount)

    return {
      month: filters.month?.trim() || "",
      totalAmount: Number(totalAmount.toFixed(2)),
      totalQty,
      txnCount: txns.length,
      byItem,
    }
  }

  async importLichiExcel(
    buffer: Buffer,
    operatorUserId: string
  ): Promise<LichiImportResult> {
    const rows = parseLichiExcel(buffer)
    let createdItems = 0
    let createdTxns = 0
    let skippedTxns = 0

    for (const row of rows) {
      const code = lichiItemCode(row.code)

      try {
        const imported = await this.prisma.$transaction(async (tx) => {
          const duplicated = await tx.warehouseTxn.findFirst({
            where: {
              type: "in",
              bizType: "purchase",
              occurDate: row.occurDate,
              qty: row.qty,
              unitPrice: row.unitPrice,
              item: { code },
            },
          })
          if (duplicated) return "skip" as const

          let item = await tx.warehouseItem.findUnique({ where: { code } })
          let createdNew = false
          if (!item) {
            try {
              item = await tx.warehouseItem.create({
                data: {
                  code,
                  name: row.name,
                  category: "",
                  spec: row.spec,
                  unit: row.unit,
                  brand: row.brand,
                  manufacturer: "",
                  supplierName: LICHI_SUPPLIER,
                  enabled: true,
                },
              })
              createdNew = true
            } catch (error) {
              if (!isPrismaUniqueViolation(error)) throw error
              item = await tx.warehouseItem.findUnique({ where: { code } })
              if (!item) throw error
            }
          }

          await this.lockWarehouseItem(tx, item.id)

          const amount = Number((row.qty * row.unitPrice).toFixed(2))
          await tx.warehouseTxn.create({
            data: {
              itemId: item.id,
              type: "in",
              bizType: "purchase",
              qty: row.qty,
              unitPrice: row.unitPrice,
              amount,
              occurDate: row.occurDate,
              operatorUserId,
            },
          })

          await tx.warehouseItem.update({
            where: { id: item.id },
            data: {
              currentQty: { increment: row.qty },
              lastPurchasePrice: row.unitPrice,
            },
          })

          return createdNew ? ("newItem" as const) : ("txn" as const)
        })

        if (imported === "skip") {
          skippedTxns += 1
          continue
        }
        if (imported === "newItem") createdItems += 1
        createdTxns += 1
      } catch {
        skippedTxns += 1
      }
    }

    return {
      totalRows: rows.length,
      createdItems,
      createdTxns,
      skippedTxns,
    }
  }
}
