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
  ValidateNested,
} from "class-validator";

import { MEDICAL_RECORD_TYPES } from "../record-rules";

export class ToothEntryDto {
  @IsString()
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
  @Type(() => Number)
  @IsInt()
  planItemId!: number;

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

  @IsOptional()
  @IsString()
  doctor?: string;

  @IsOptional()
  @IsString()
  assistant?: string;

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
