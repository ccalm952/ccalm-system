import { IsIn, IsOptional, IsString, Matches } from "class-validator";

import { FOLLOW_UP_SATISFACTIONS } from "../follow-up-options";

export class CompleteFollowUpDto {
  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsIn(FOLLOW_UP_SATISFACTIONS)
  satisfaction?: string;

  /** 填了就顺带生成下一次随访 */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "下次随访日期格式无效" })
  nextPlanDate?: string;
}
