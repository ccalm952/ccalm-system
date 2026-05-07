import { Transform, Type } from "class-transformer"
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from "class-validator"

export class ImplantToothInputDto {
  @IsOptional()
  @IsString()
  toothNo?: string

  @IsOptional()
  @IsString()
  implantBrand?: string

  @IsOptional()
  @IsString()
  implantModel?: string

  @IsOptional()
  @IsString()
  toothRemark?: string
}

export class CreateImplantVisitDto {
  @IsString()
  phone!: string

  @IsString()
  patientName!: string

  @Transform(({ value }) =>
    value == null || value === "" ? "" : String(value).trim()
  )
  @IsString()
  @MinLength(1, { message: "请填写病历号" })
  chartNo!: string

  @IsOptional()
  @IsString()
  birthday?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  age?: number | null

  @IsString()
  visitDate!: string

  @IsOptional()
  @IsString()
  remark?: string | null

  @IsOptional()
  @IsString()
  staff?: string | null

  @IsOptional()
  @IsString()
  followUp?: string | null

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImplantToothInputDto)
  teeth!: ImplantToothInputDto[]
}
