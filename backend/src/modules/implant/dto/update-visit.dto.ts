import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString } from "class-validator"

export class UpdateImplantVisitDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  toothId?: number | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  patientId?: number

  @IsOptional()
  @IsString()
  patientName?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  visitDate?: string

  @IsOptional()
  @IsString()
  remark?: string | null

  @IsOptional()
  @IsString()
  staff?: string | null

  @IsOptional()
  @IsString()
  toothNo?: string | null

  @IsOptional()
  @IsString()
  implantBrand?: string | null

  @IsOptional()
  @IsString()
  implantModel?: string | null

  @IsOptional()
  @IsString()
  toothRemark?: string | null
}
