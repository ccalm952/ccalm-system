import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString, Min } from "class-validator"

export class AddInventoryDto {
  @IsString()
  brand!: string

  @IsString()
  modelCode!: string

  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplement!: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number
}

export class UpdateInventoryDto {
  @IsString()
  brand!: string

  @IsString()
  modelCode!: string

  @Type(() => Number)
  @IsInt()
  @Min(0)
  supplement!: number
}
