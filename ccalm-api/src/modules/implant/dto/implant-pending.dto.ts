import { IsOptional, IsString, MinLength } from "class-validator"

export class CreateImplantPendingDto {
  @IsString()
  @MinLength(1)
  name!: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  chartNo?: string

  @IsOptional()
  @IsString()
  teeth?: string

  @IsOptional()
  @IsString()
  extractionDate?: string | null

  @IsOptional()
  @IsString()
  remark?: string
}

export class UpdateImplantPendingDto {
  @IsString()
  @MinLength(1)
  name!: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  chartNo?: string

  @IsOptional()
  @IsString()
  teeth?: string

  @IsOptional()
  @IsString()
  extractionDate?: string | null

  @IsOptional()
  @IsString()
  remark?: string
}
