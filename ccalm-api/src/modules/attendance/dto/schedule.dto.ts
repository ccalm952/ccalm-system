import { IsNumber, IsString, Matches, Min } from "class-validator"

export class UpsertScheduleMonthConfigDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month!: string

  @IsNumber()
  @Min(0)
  monthAllowance!: number
}
