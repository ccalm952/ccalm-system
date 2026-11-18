import { IsIn, IsOptional, Matches } from "class-validator";

export type RevenueGranularity = "day" | "week" | "month";

export class RevenueQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "开始日期格式无效" })
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "结束日期格式无效" })
  to!: string;

  @IsOptional()
  @IsIn(["day", "week", "month"], { message: "统计方式无效" })
  granularity?: RevenueGranularity;
}
