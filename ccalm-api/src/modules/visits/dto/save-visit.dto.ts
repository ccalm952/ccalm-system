import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches } from "class-validator";

import { VISIT_KINDS, VISIT_STATUSES } from "../visit-options";

export class SaveVisitDto {
  @Type(() => Number)
  @IsInt()
  patientId!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "就诊日期格式无效" })
  visitDate!: string;

  @IsOptional()
  @Matches(/^(\d{2}:\d{2})?$/, { message: "开始时间格式无效" })
  startTime?: string;

  @IsOptional()
  @Matches(/^(\d{2}:\d{2})?$/, { message: "结束时间格式无效" })
  endTime?: string;

  @IsIn(VISIT_KINDS)
  kind!: (typeof VISIT_KINDS)[number];

  @IsIn(VISIT_STATUSES)
  status!: (typeof VISIT_STATUSES)[number];

  @IsOptional()
  @IsString()
  doctor?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
