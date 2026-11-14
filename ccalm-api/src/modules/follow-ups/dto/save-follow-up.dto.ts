import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches } from "class-validator";

import { FOLLOW_UP_TYPES } from "../follow-up-options";

export class SaveFollowUpDto {
  @Type(() => Number)
  @IsInt()
  patientId!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "计划随访日期格式无效" })
  planDate!: string;

  @IsIn(FOLLOW_UP_TYPES)
  type!: (typeof FOLLOW_UP_TYPES)[number];

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  doctor?: string;
}
