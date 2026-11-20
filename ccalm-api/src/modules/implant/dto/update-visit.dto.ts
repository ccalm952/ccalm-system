import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Matches } from "class-validator";

export class UpdateImplantVisitDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  toothId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  patientId?: number;

  @IsOptional()
  @IsString()
  patientName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  visitDate?: string;

  @IsOptional()
  @IsString()
  remark?: string | null;

  @IsOptional()
  @IsString()
  doctor?: string | null;

  /** 配台人员，不是医生 */
  @IsOptional()
  @IsString()
  staff?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^$|^(?:[1-4][1-8]|[5-8][1-5])$/, {
    message: "牙位只能填 FDI 编号，如 11、12、36",
  })
  toothNo?: string | null;

  @IsOptional()
  @IsString()
  implantBrand?: string | null;

  @IsOptional()
  @IsString()
  implantModel?: string | null;

  @IsOptional()
  @IsString()
  toothRemark?: string | null;
}
