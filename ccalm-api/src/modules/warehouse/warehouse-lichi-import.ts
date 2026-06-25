import { BadRequestException } from "@nestjs/common"
import dayjs from "dayjs"
import * as XLSX from "xlsx"

export type LichiImportRow = {
  orderNo: string
  shipNo: string
  shipDate: string
  productCode: string
  name: string
  brand: string
  spec: string
  unit: string
  batch: string
  qty: number
  unitPrice: number
  manufacturer: string
  category: string
  remarkKey: string
}

export type LichiImportResult = {
  totalRows: number
  createdItems: number
  createdTxns: number
  skippedTxns: number
}

const SUPPLIER = "励齿"

function cell(row: Record<string, unknown>, key: string): string {
  const v = row[key]
  if (v == null) return ""
  if (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return String(v).trim()
  }
  return ""
}

function warehouseCode(productCode: string): string {
  const code = productCode.trim().replace(/^LC/i, "")
  if (!code) throw new BadRequestException("存在空的商品编码")
  return code
}

function parseQty(value: string): number {
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n) || n <= 0) {
    throw new BadRequestException(`数量不合法：${value}`)
  }
  return Math.round(n)
}

function parsePrice(value: string): number {
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n) || n < 0) {
    throw new BadRequestException(`单价不合法：${value}`)
  }
  return n
}

function parseDate(value: string): string {
  const d = dayjs(value, ["YYYY-MM-DD", "YYYY/M/D"], true)
  if (!d.isValid()) throw new BadRequestException(`发货日期不合法：${value}`)
  return d.format("YYYY-MM-DD")
}

export function parseLichiExcel(buffer: Buffer): LichiImportRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new BadRequestException("Excel 中没有工作表")

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets[sheetName],
    { defval: "" }
  )
  if (rows.length === 0) throw new BadRequestException("Excel 中没有数据行")

  return rows.map((row, index) => {
    const productCode = cell(row, "商品编码")
    const name = cell(row, "商品名称")
    if (!productCode || !name) {
      throw new BadRequestException(`第 ${index + 2} 行缺少商品编码或商品名称`)
    }

    const shipNo = cell(row, "发货单号")
    const batch = cell(row, "批次")
    const orderNo = cell(row, "订单号")

    return {
      orderNo,
      shipNo,
      shipDate: parseDate(cell(row, "发货日期")),
      productCode,
      name,
      brand: cell(row, "品牌"),
      spec: cell(row, "规格型号"),
      unit: cell(row, "计量单位") || "个",
      batch,
      qty: parseQty(cell(row, "数量")),
      unitPrice: parsePrice(cell(row, "含税单价")),
      manufacturer: cell(row, "生产厂商"),
      category: cell(row, "分类"),
      remarkKey: `励齿|${shipNo}|${productCode}|${batch}|${orderNo}`,
    }
  })
}

export function lichiTxnRemark(row: LichiImportRow): string {
  const parts = [
    `励齿导入`,
    row.shipNo ? `发货单:${row.shipNo}` : "",
    row.orderNo ? `订单:${row.orderNo}` : "",
    row.batch ? `批次:${row.batch}` : "",
  ].filter(Boolean)
  return parts.join(" ")
}

export function lichiItemCode(productCode: string): string {
  return warehouseCode(productCode)
}

export const LICHI_SUPPLIER = SUPPLIER
