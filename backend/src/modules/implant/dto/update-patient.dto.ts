import { Type } from "class-transformer"
import { IsInt, IsOptional, IsString, Min } from "class-validator"

export class UpdateImplantPatientDto {
  @IsString()
  name!: string

  @IsString()
  phone!: string

  @IsOptional()
  @IsString()
  gender?: string

  @IsOptional()
  @IsString()
  chartNo?: string

  @IsOptional()
  @IsString()
  birthday?: string | null

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  age?: number | null
}
