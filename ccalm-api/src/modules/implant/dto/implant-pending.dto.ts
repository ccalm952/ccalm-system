import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";

const FDI_TOOTH_LIST =
  /^$|^(?:[1-4][1-8]|[5-8][1-5])(?:,(?:[1-4][1-8]|[5-8][1-5]))*$/;

export class CreateImplantPendingDto {
  /** 下拉选中的已有患者 */
  @IsOptional()
  @IsInt()
  patientId?: number;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  chartNo?: string;

  @IsOptional()
  @IsString()
  @Matches(FDI_TOOTH_LIST, { message: "牙位只能填 FDI 编号，如 11,12,36" })
  teeth?: string;

  @IsOptional()
  @IsString()
  extractionDate?: string | null;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateImplantPendingDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  chartNo?: string;

  @IsOptional()
  @IsString()
  @Matches(FDI_TOOTH_LIST, { message: "牙位只能填 FDI 编号，如 11,12,36" })
  teeth?: string;

  @IsOptional()
  @IsString()
  extractionDate?: string | null;

  @IsOptional()
  @IsString()
  remark?: string;
}
