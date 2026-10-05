import { IsNumber, IsString, IsUUID, Matches, Min } from "class-validator";

export class UpsertScheduleMonthConfigDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;

  @IsNumber()
  @Min(0)
  monthAllowance!: number;
}

export class UpsertScheduleLeaveOffsetDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;

  @IsUUID()
  userId!: string;

  @IsNumber()
  @Min(0)
  days!: number;
}
