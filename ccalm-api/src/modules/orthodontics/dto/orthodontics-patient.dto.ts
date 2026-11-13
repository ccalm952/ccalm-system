import { IsIn, IsInt, IsOptional, IsString } from "class-validator";

const CATEGORIES = ["treating", "invisible", "appliance", "completed"] as const;

export class CreateOrthodonticsPatientDto {
  /** 下拉选中的已有患者 */
  @IsOptional()
  @IsInt()
  patientId?: number;

  @IsIn(CATEGORIES)
  category!: (typeof CATEGORIES)[number];

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  chartNo?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  applianceModel?: string;

  @IsOptional()
  @IsString()
  lastVisitDate?: string | null;

  @IsOptional()
  @IsString()
  followUp?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  doctor?: string;
}

export class UpdateOrthodonticsPatientDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  chartNo?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  applianceModel?: string;

  @IsOptional()
  @IsString()
  lastVisitDate?: string | null;

  @IsOptional()
  @IsString()
  followUp?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  doctor?: string;

  @IsOptional()
  @IsIn(CATEGORIES)
  category?: (typeof CATEGORIES)[number];
}
