import { Type } from "class-transformer"
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator"

const warehouseTxnTypes = ["in", "out", "adjust"] as const
const warehouseTxnBizTypes = [
  "purchase",
  "use",
  "return_in",
  "return_out",
  "adjust_in",
  "adjust_out",
] as const

export class CreateWarehouseItemDto {
  @IsString()
  code!: string

  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  spec?: string

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsString()
  manufacturer?: string

  @IsOptional()
  @IsString()
  supplierName?: string

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean
}

export class UpdateWarehouseItemDto {
  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  spec?: string

  @IsOptional()
  @IsString()
  unit?: string

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsString()
  manufacturer?: string

  @IsOptional()
  @IsString()
  supplierName?: string

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  enabled?: boolean
}

export class CreateWarehouseTxnDto {
  @Type(() => Number)
  @IsInt()
  itemId!: number

  @IsString()
  @IsIn(warehouseTxnTypes)
  type!: (typeof warehouseTxnTypes)[number]

  @IsString()
  @IsIn(warehouseTxnBizTypes)
  bizType!: (typeof warehouseTxnBizTypes)[number]

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty!: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice!: number

  @IsString()
  occurDate!: string

  @IsOptional()
  @IsString()
  remark?: string
}
