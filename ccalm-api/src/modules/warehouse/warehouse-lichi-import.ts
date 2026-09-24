import { BadRequestException } from "@nestjs/common"
import dayjs from "dayjs"
import * as XLSX from "xlsx"

export type LichiImportRow = {
  code: string
  name: string
  occurDate: string
  qty: number
  unitPrice: number
  brand: string
  spec: string
  unit: string
}

export type LichiImportResult = {
  totalRows: number
  createdItems: number
  createdTxns: number
  skippedTxns: number
}

const SUPPLIER = "励齿"

type ImportField =
  | "code"
  | "name"
  | "occurDate"
  | "qty"
  | "unitPrice"
  | "brand"
  | "spec"
  | "unit"

const FIELD_LABELS: Record<ImportField, string> = {
  code: "编码",
  name: "名称",
  occurDate: "日期",
  qty: "数量",
  unitPrice: "单价",
  brand: "品牌",
  spec: "规格",
  unit: "单位",
}

/** 按优先级匹配列头，列名包含关键词即可（如「商品编码」匹配「编码」） */
const FIELD_KEYWORDS: Record<ImportField, string[]> = {
  code: ["商品编码", "编码"],
  name: ["商品名称", "名称"],
  occurDate: ["发货日期", "日期"],
  qty: ["数量"],
  unitPrice: ["含税单价", "单价"],
  brand: ["品牌"],
  spec: ["规格型号", "规格"],
  unit: ["计量单位", "单位"],
}

const REQUIRED_FIELDS: ImportField[] = [
  "code",
  "name",
  "occurDate",
  "qty",
  "unitPrice",
]

function normalizeHeader(value: unknown): string {
  if (value == null) return ""
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value).trim().replace(/\s+/g, "")
  }
  return ""
}

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

function resolveColumnMap(
  headers: string[]
): Record<ImportField, string | null> {
  const normalized = headers.map((h) => normalizeHeader(h))
  const used = new Set<number>()
  const map = Object.fromEntries(
    (Object.keys(FIELD_KEYWORDS) as ImportField[]).map((field) => [field, null])
  ) as Record<ImportField, string | null>

  for (const field of Object.keys(FIELD_KEYWORDS) as ImportField[]) {
    for (const keyword of FIELD_KEYWORDS[field]) {
      const idx = normalized.findIndex(
        (header, index) => !used.has(index) && header.includes(keyword)
      )
      if (idx >= 0) {
        map[field] = headers[idx]!
        used.add(idx)
        break
      }
    }
  }

  return map
}

function requireColumnMap(headers: string[]): Record<ImportField, string> {
  const map = resolveColumnMap(headers)
  const missing = REQUIRED_FIELDS.filter((field) => !map[field]).map(
    (field) => FIELD_LABELS[field]
  )
  if (missing.length) {
    throw new BadRequestException(`Excel 缺少列：${missing.join("、")}`)
  }
  return map as Record<ImportField, string>
}

function readField(
  row: Record<string, unknown>,
  map: Record<ImportField, string>,
  field: ImportField
): string {
  return cell(row, map[field])
}

function readOptionalField(
  row: Record<string, unknown>,
  map: Record<ImportField, string | null>,
  field: ImportField
): string {
  const col = map[field]
  return col ? cell(row, col) : ""
}

function warehouseCode(code: string): string {
  const value = code.trim()
  if (!value) throw new BadRequestException("存在空的编码")
  return value
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
  if (!d.isValid()) throw new BadRequestException(`日期不合法：${value}`)
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

  const headers = Object.keys(rows[0] ?? {})
  const requiredMap = requireColumnMap(headers)
  const fullMap = resolveColumnMap(headers)

  return rows.map((row, index) => {
    const code = readField(row, requiredMap, "code")
    const name = readField(row, requiredMap, "name")
    const occurDateRaw = readField(row, requiredMap, "occurDate")
    const qtyRaw = readField(row, requiredMap, "qty")
    const unitPriceRaw = readField(row, requiredMap, "unitPrice")

    if (!code || !name) {
      throw new BadRequestException(`第 ${index + 2} 行缺少编码或名称`)
    }
    if (!occurDateRaw) {
      throw new BadRequestException(`第 ${index + 2} 行缺少日期`)
    }
    if (!qtyRaw) {
      throw new BadRequestException(`第 ${index + 2} 行缺少数量`)
    }
    if (!unitPriceRaw) {
      throw new BadRequestException(`第 ${index + 2} 行缺少单价`)
    }

    const occurDate = parseDate(occurDateRaw)
    const qty = parseQty(qtyRaw)
    const unitPrice = parsePrice(unitPriceRaw)
    const normalizedCode = warehouseCode(code)

    return {
      code: normalizedCode,
      name,
      occurDate,
      qty,
      unitPrice,
      brand: readOptionalField(row, fullMap, "brand"),
      spec: readOptionalField(row, fullMap, "spec"),
      unit: readOptionalField(row, fullMap, "unit") || "个",
    }
  })
}

export function lichiItemCode(code: string): string {
  return warehouseCode(code)
}

export const LICHI_SUPPLIER = SUPPLIER
