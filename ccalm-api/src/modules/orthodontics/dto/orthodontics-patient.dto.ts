import { IsIn, IsOptional, IsString } from "class-validator"

const CATEGORIES = ["active", "appliance", "removed"] as const

export class CreateOrthodonticsPatientDto {
  @IsIn(CATEGORIES)
  category!: (typeof CATEGORIES)[number]

  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  chartNo?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  applianceModel?: string

  @IsOptional()
  @IsString()
  lastVisitDate?: string | null

  @IsOptional()
  @IsString()
  followUp?: string

  @IsOptional()
  @IsString()
  remark?: string

  @IsOptional()
  @IsString()
  doctor?: string
}

export class UpdateOrthodonticsPatientDto {
  @IsString()
  name!: string

  @IsOptional()
  @IsString()
  chartNo?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  applianceModel?: string

  @IsOptional()
  @IsString()
  lastVisitDate?: string | null

  @IsOptional()
  @IsString()
  followUp?: string

  @IsOptional()
  @IsString()
  remark?: string

  @IsOptional()
  @IsString()
  doctor?: string
}
