import { Prisma, WarehouseItem, WarehouseProduct } from "@prisma/client"
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

type WarehouseItemWithProduct = WarehouseItem & { product: WarehouseProduct }

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

function namesEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function resolveItemSpec(
  dtoSpec: string | undefined,
  existingSpec: string,
  fallbackName: string
): string {
  const spec = dtoSpec != null ? cleanText(dtoSpec) : existingSpec
  return spec || fallbackName
}

function buildProductFieldsFromDto(
  dto: UpdateWarehouseItemDto,
  fallback: WarehouseProduct
): {
  category: string
  brand: string
  manufacturer: string
  supplierName: string
  defaultUnit: string
} {
  return {
    category: dto.category != null ? cleanText(dto.category) : fallback.category,
    brand: dto.brand != null ? cleanText(dto.brand) : fallback.brand,
    manufacturer:
      dto.manufacturer != null
        ? cleanText(dto.manufacturer)
        : fallback.manufacturer,
    supplierName:
      dto.supplierName != null
        ? cleanText(dto.supplierName)
        : fallback.supplierName,
    defaultUnit: dto.unit != null ? cleanText(dto.unit, "个") : fallback.defaultUnit,
  }
}

function mapItemRow(item: WarehouseItemWithProduct) {
  return {
    id: item.id,
    productId: item.productId,
    code: item.code,
    spec: item.spec,
    unit: item.unit,
    currentQty: item.currentQty,
    lastPurchasePrice: item.lastPurchasePrice,
    enabled: item.enabled,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    name: item.product.name,
    category: item.product.category,
    brand: item.product.brand,
    manufacturer: item.product.manufacturer,
    supplierName: item.product.supplierName,
  }
}

const itemInclude = { product: true } as const

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

  async listProducts(q?: string) {
    const keyword = q?.trim()
    return await this.prisma.warehouseProduct.findMany({
      where: keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: "insensitive" } },
              { category: { contains: keyword, mode: "insensitive" } },
              { brand: { contains: keyword, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ enabled: "desc" }, { name: "asc" }, { id: "asc" }],
    })
  }

  async listItems(q?: string) {
    const keyword = q?.trim()
    const items = await this.prisma.warehouseItem.findMany({
      where: keyword
        ? {
            OR: [
              { code: { contains: keyword, mode: "insensitive" } },
              { spec: { contains: keyword, mode: "insensitive" } },
              {
                product: {
                  OR: [
                    { name: { contains: keyword, mode: "insensitive" } },
                    { category: { contains: keyword, mode: "insensitive" } },
                    { brand: { contains: keyword, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : undefined,
      include: itemInclude,
      orderBy: [
        { enabled: "desc" },
        { product: { category: "asc" } },
        { product: { name: "asc" } },
        { spec: "asc" },
        { id: "asc" },
      ],
    })
    return items.map(mapItemRow)
  }

  private async resolveProductId(
    tx: Prisma.TransactionClient,
    dto: Pick<
      CreateWarehouseItemDto,
      | "productId"
      | "name"
      | "category"
      | "brand"
      | "manufacturer"
      | "supplierName"
      | "unit"
      | "enabled"
    >
  ) {
    if (dto.productId != null) {
      const product = await tx.warehouseProduct.findUnique({
        where: { id: dto.productId },
      })
      if (!product) throw new NotFoundException("产品不存在")
      return product.id
    }

    const name = cleanText(dto.name)
    if (!name) throw new BadRequestException("产品名称不能为空")

    const existing = await tx.warehouseProduct.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })
    if (existing) return existing.id

    const product = await tx.warehouseProduct.create({
      data: {
        name,
        category: cleanText(dto.category, "其他"),
        brand: cleanText(dto.brand),
        manufacturer: cleanText(dto.manufacturer),
        supplierName: cleanText(dto.supplierName),
        defaultUnit: cleanText(dto.unit, "个"),
        enabled: dto.enabled ?? true,
      },
    })
    return product.id
  }

  async createItem(dto: CreateWarehouseItemDto) {
    const code = cleanText(dto.code)
    if (!code) throw new BadRequestException("编码不能为空")
    if (dto.productId == null && !cleanText(dto.name)) {
      throw new BadRequestException("请选择已有产品或填写产品名称")
    }

    const duplicatedCode = await this.prisma.warehouseItem.findUnique({
      where: { code },
    })
    if (duplicatedCode) throw new BadRequestException("编码已存在")

    const spec = cleanText(dto.spec)

    try {
      const item = await this.prisma.$transaction(async (tx) => {
        const productId = await this.resolveProductId(tx, dto)

        const duplicatedSpec = await tx.warehouseItem.findFirst({
          where: { productId, spec },
        })
        if (duplicatedSpec) {
          throw new BadRequestException("该产品下已有相同规格")
        }

        return await tx.warehouseItem.create({
          data: {
            productId,
            code,
            spec,
            unit: cleanText(dto.unit, "个"),
            enabled: dto.enabled ?? true,
          },
          include: itemInclude,
        })
      })
      return mapItemRow(item)
    } catch (error) {
      if (error instanceof BadRequestException) throw error
      if (isPrismaUniqueViolation(error)) {
        throw new BadRequestException("编码已存在或该产品下规格重复")
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
      include: itemInclude,
    })
    if (!existing) throw new NotFoundException("物料不存在")

    const itemData: Prisma.WarehouseItemUpdateInput = {}
    const productData: Prisma.WarehouseProductUpdateInput = {}

    if (dto.code != null) {
      const code = cleanText(dto.code)
      if (!code) throw new BadRequestException("编码不能为空")
      itemData.code = code
    }
    if (dto.spec != null) itemData.spec = cleanText(dto.spec)
    if (dto.unit != null) itemData.unit = cleanText(dto.unit, "个")
    if (typeof dto.enabled === "boolean") itemData.enabled = dto.enabled

    if (dto.name != null) {
      const name = cleanText(dto.name)
      if (!name) throw new BadRequestException("产品名称不能为空")
      productData.name = name
    }
    if (dto.category != null) productData.category = cleanText(dto.category)
    if (dto.brand != null) productData.brand = cleanText(dto.brand)
    if (dto.manufacturer != null) {
      productData.manufacturer = cleanText(dto.manufacturer)
    }
    if (dto.supplierName != null) {
      productData.supplierName = cleanText(dto.supplierName)
    }

    if ("code" in itemData && itemData.code) {
      const duplicated = await this.prisma.warehouseItem.findFirst({
        where: { code: itemData.code as string, NOT: { id } },
      })
      if (duplicated) throw new BadRequestException("编码已存在")
    }

    if ("spec" in itemData) {
      const duplicatedSpec = await this.prisma.warehouseItem.findFirst({
        where: {
          productId: existing.productId,
          spec: itemData.spec as string,
          NOT: { id },
        },
      })
      if (duplicatedSpec) {
        throw new BadRequestException("该产品下已有相同规格")
      }
    }

    const mergeTarget =
      dto.name != null
        ? await this.prisma.warehouseProduct.findFirst({
            where: {
              name: { equals: cleanText(dto.name), mode: "insensitive" },
              NOT: { id: existing.productId },
            },
          })
        : null

    if (mergeTarget) {
      const mergeSpec = resolveItemSpec(
        dto.spec,
        existing.spec,
        existing.product.name
      )

      const duplicatedSpec = await this.prisma.warehouseItem.findFirst({
        where: {
          productId: mergeTarget.id,
          spec: mergeSpec,
          NOT: { id },
        },
      })
      if (duplicatedSpec) {
        throw new BadRequestException("目标产品下已有相同规格")
      }

      const mergeFields = buildProductFieldsFromDto(dto, existing.product)
      const mergeProductData: Prisma.WarehouseProductUpdateInput = {}
      if (dto.category != null) mergeProductData.category = mergeFields.category
      if (dto.brand != null) mergeProductData.brand = mergeFields.brand
      if (dto.manufacturer != null) {
        mergeProductData.manufacturer = mergeFields.manufacturer
      }
      if (dto.supplierName != null) {
        mergeProductData.supplierName = mergeFields.supplierName
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

        if (Object.keys(mergeProductData).length > 0) {
          await tx.warehouseProduct.update({
            where: { id: mergeTarget.id },
            data: mergeProductData,
          })
        }

        await tx.warehouseItem.update({
          where: { id },
          data: {
            ...(dto.code != null ? { code: cleanText(dto.code) } : {}),
            ...(dto.unit != null ? { unit: cleanText(dto.unit, "个") } : {}),
            ...(typeof dto.enabled === "boolean" ? { enabled: dto.enabled } : {}),
            productId: mergeTarget.id,
            spec: mergeSpec,
            ...(dto.currentQty != null ? { currentQty: nextQty } : {}),
          },
        })

        const remaining = await tx.warehouseItem.count({
          where: { productId: existing.productId },
        })
        if (remaining === 0) {
          await tx.warehouseProduct.delete({ where: { id: existing.productId } })
        }
      })

      const item = await this.prisma.warehouseItem.findUnique({
        where: { id },
        include: itemInclude,
      })
      return item ? mapItemRow(item) : null
    }

    const newName = dto.name != null ? cleanText(dto.name) : null
    const nameChanging =
      newName != null && !namesEqual(newName, existing.product.name)

    if (nameChanging && newName) {
      const siblingCount = await this.prisma.warehouseItem.count({
        where: { productId: existing.productId },
      })

      if (siblingCount > 1) {
        const splitSpec = resolveItemSpec(
          dto.spec,
          existing.spec,
          existing.product.name
        )
        const splitFields = buildProductFieldsFromDto(dto, existing.product)

        try {
          await this.prisma.$transaction(async (tx) => {
            const locked = await this.lockWarehouseItem(tx, id)
            const nextQty =
              dto.currentQty != null
                ? Math.round(dto.currentQty)
                : locked.currentQty
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

            const newProduct = await tx.warehouseProduct.create({
              data: {
                name: newName,
                category: splitFields.category,
                brand: splitFields.brand,
                manufacturer: splitFields.manufacturer,
                supplierName: splitFields.supplierName,
                defaultUnit: splitFields.defaultUnit,
                enabled: existing.product.enabled,
              },
            })

            await tx.warehouseItem.update({
              where: { id },
              data: {
                ...(dto.code != null ? { code: cleanText(dto.code) } : {}),
                ...(dto.unit != null ? { unit: cleanText(dto.unit, "个") } : {}),
                ...(typeof dto.enabled === "boolean"
                  ? { enabled: dto.enabled }
                  : {}),
                productId: newProduct.id,
                spec: splitSpec,
                ...(dto.currentQty != null ? { currentQty: nextQty } : {}),
              },
            })
          })
        } catch (error) {
          if (isPrismaUniqueViolation(error)) {
            throw new BadRequestException("产品名称已存在")
          }
          throw error
        }

        const item = await this.prisma.warehouseItem.findUnique({
          where: { id },
          include: itemInclude,
        })
        return item ? mapItemRow(item) : null
      }
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

      if (Object.keys(productData).length > 0) {
        await tx.warehouseProduct.update({
          where: { id: existing.productId },
          data: productData,
        })
      }

      await tx.warehouseItem.update({
        where: { id },
        data: {
          ...itemData,
          ...(dto.currentQty != null ? { currentQty: nextQty } : {}),
        },
      })
    })

    const item = await this.prisma.warehouseItem.findUnique({
      where: { id },
      include: itemInclude,
    })
    return item ? mapItemRow(item) : null
  }

  async deleteItem(id: number) {
    const item = await this.prisma.warehouseItem.findUnique({
      where: { id },
    })
    if (!item) throw new NotFoundException("物料不存在")

    await this.prisma.$transaction(async (tx) => {
      await tx.warehouseTxn.deleteMany({ where: { itemId: id } })
      await tx.warehouseItem.delete({ where: { id } })

      const remaining = await tx.warehouseItem.count({
        where: { productId: item.productId },
      })
      if (remaining === 0) {
        await tx.warehouseProduct.delete({ where: { id: item.productId } })
      }
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

    const [total, rows] = await Promise.all([
      this.prisma.warehouseTxn.count({ where }),
      this.prisma.warehouseTxn.findMany({
        where,
        include: {
          item: { include: itemInclude },
          operatorUser: {
            select: { displayName: true, username: true },
          },
        },
        orderBy: [{ occurDate: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    const items = rows.map((txn) => ({
      ...txn,
      item: mapItemRow(txn.item),
    }))

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
      include: { item: { include: itemInclude } },
      orderBy: [{ amount: "desc" }, { id: "desc" }],
    })

    const byItemMap = new Map<
      number,
      {
        itemId: number
        productId: number
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
      const row = mapItemRow(txn.item)
      const prev = byItemMap.get(txn.itemId) ?? {
        itemId: txn.itemId,
        productId: row.productId,
        code: row.code,
        name: row.name,
        spec: row.spec,
        unit: row.unit,
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

  private async findOrCreateProductByName(
    tx: Prisma.TransactionClient,
    row: {
      name: string
      spec: string
      unit: string
      brand: string
    }
  ) {
    const name = cleanText(row.name)
    if (!name) throw new BadRequestException("导入行缺少名称")

    let product = await tx.warehouseProduct.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })
    if (!product) {
      product = await tx.warehouseProduct.create({
        data: {
          name,
          category: "",
          brand: cleanText(row.brand),
          manufacturer: "",
          supplierName: LICHI_SUPPLIER,
          defaultUnit: cleanText(row.unit, "个"),
          enabled: true,
        },
      })
    }
    return product
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

          let item = await tx.warehouseItem.findUnique({
            where: { code },
            include: itemInclude,
          })
          let createdNew = false
          if (!item) {
            const product = await this.findOrCreateProductByName(tx, row)
            const spec = cleanText(row.spec)

            const duplicatedSpec = await tx.warehouseItem.findFirst({
              where: { productId: product.id, spec },
            })
            if (duplicatedSpec) {
              throw new BadRequestException("该产品下已有相同规格")
            }

            try {
              item = await tx.warehouseItem.create({
                data: {
                  productId: product.id,
                  code,
                  spec,
                  unit: cleanText(row.unit, "个"),
                  enabled: true,
                },
                include: itemInclude,
              })
              createdNew = true
            } catch (error) {
              if (!isPrismaUniqueViolation(error)) throw error
              item = await tx.warehouseItem.findUnique({
                where: { code },
                include: itemInclude,
              })
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
