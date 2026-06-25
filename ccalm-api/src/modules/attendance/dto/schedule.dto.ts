import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from "class-validator"
import { Type } from "class-transformer"

export class UpsertScheduleMonthConfigDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month!: string

  @IsNumber()
  @Min(0)
  monthAllowance!: number
}

export class ScheduleEntryChangeDto {
  @IsString()
  userId!: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string

  @IsOptional()
  @IsIn(["full_rest", "morning_rest", "afternoon_rest"])
  shiftType?: "full_rest" | "morning_rest" | "afternoon_rest" | null
}

export class UpsertScheduleEntriesDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month!: string

  @ValidateNested({ each: true })
  @Type(() => ScheduleEntryChangeDto)
  entries!: ScheduleEntryChangeDto[]
}
