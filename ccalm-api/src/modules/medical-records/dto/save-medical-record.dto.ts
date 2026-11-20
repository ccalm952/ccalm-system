import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import { MEDICAL_RECORD_TYPES } from "../record-rules";

const FDI_TOOTH_LIST =
  /^$|^(?:[1-4][1-8]|[5-8][1-5])(?:,(?:[1-4][1-8]|[5-8][1-5]))*$/;

export class ToothEntryDto {
  @IsString()
  @Matches(FDI_TOOTH_LIST, {
    message: "牙位只能填 FDI 编号，如 11,12,36",
  })
  teeth!: string;

  @IsString()
  text!: string;
}

export class PlanItemDto extends ToothEntryDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number | null;

  @IsOptional()
  @IsString()
  discountNote?: string;
}

export class PlanLinkDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  planItemId?: number;

  /** 初诊保存时计划行还没有 id，用本次提交的计划行下标关联 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  planItemIndex?: number;

  @IsBoolean()
  completes!: boolean;
}

export class SaveMedicalRecordDto {
  @Type(() => Number)
  @IsInt()
  patientId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  visitId?: number | null;

  /** 为 true 时按病历日期时间新建一次就诊并关联 */
  @IsOptional()
  @IsBoolean()
  createVisit?: boolean;

  @IsIn(MEDICAL_RECORD_TYPES)
  type!: (typeof MEDICAL_RECORD_TYPES)[number];

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "就诊日期格式无效" })
  visitDate!: string;

  @IsOptional()
  @Matches(/^(\d{2}:\d{2})?$/, { message: "就诊时间格式无效" })
  visitTime?: string;

  @IsString()
  @MinLength(1, { message: "请选择医生" })
  doctor!: string;

  @IsOptional()
  @IsString()
  nurse?: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  presentIllness?: string;

  @IsOptional()
  @IsString()
  pastHistory?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToothEntryDto)
  oralExam?: ToothEntryDto[];

  @IsOptional()
  @IsString()
  auxiliaryExam?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToothEntryDto)
  diagnosis?: ToothEntryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanItemDto)
  treatmentPlan?: PlanItemDto[];

  /** 复诊病历本次处理的治疗计划行 */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanLinkDto)
  planLinks?: PlanLinkDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ToothEntryDto)
  treatment!: ToothEntryDto[];

  @IsOptional()
  @IsString()
  advice?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
