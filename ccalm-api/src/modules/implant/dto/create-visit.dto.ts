import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from "class-validator";

const FDI_TOOTH = /^(?:[1-4][1-8]|[5-8][1-5])$/;

export class ImplantToothInputDto {
  @IsOptional()
  @IsString()
  @Matches(FDI_TOOTH, { message: "牙位只能填 FDI 编号，如 11、12、36" })
  toothNo?: string;

  @IsOptional()
  @IsString()
  implantBrand?: string;

  @IsOptional()
  @IsString()
  implantModel?: string;

  @IsOptional()
  @IsString()
  toothRemark?: string;
}

export class CreateImplantVisitDto {
  /** 下拉选中的已有患者 */
  @IsOptional()
  @IsInt()
  patientId?: number;

  @IsString()
  phone!: string;

  @IsString()
  patientName!: string;

  @Transform(({ value }) =>
    value == null || value === "" ? "" : String(value).trim(),
  )
  @IsString()
  @MinLength(1, { message: "请填写病历号" })
  chartNo!: string;

  @IsOptional()
  @IsString()
  birthday?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  age?: number | null;

  @IsString()
  visitDate!: string;

  @IsOptional()
  @IsString()
  remark?: string | null;

  @IsOptional()
  @IsString()
  staff?: string | null;

  @IsOptional()
  @IsString()
  followUp?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImplantToothInputDto)
  teeth!: ImplantToothInputDto[];
}
