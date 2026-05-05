import { IsString, Matches } from "class-validator"

const HHMM = /^\d{1,2}:\d{2}$/

export class UpsertShiftDto {
  @IsString()
  morningLabel!: string

  @IsString()
  @Matches(HHMM)
  morningRangeStart!: string

  @IsString()
  @Matches(HHMM)
  morningRangeEnd!: string

  @IsString()
  afternoonLabel!: string

  @IsString()
  @Matches(HHMM)
  afternoonRangeStart!: string

  @IsString()
  @Matches(HHMM)
  afternoonRangeEnd!: string

  @IsString()
  @Matches(HHMM)
  morningInWindowStart!: string

  @IsString()
  @Matches(HHMM)
  morningInWindowEnd!: string

  @IsString()
  @Matches(HHMM)
  morningOutWindowStart!: string

  @IsString()
  @Matches(HHMM)
  morningOutWindowEnd!: string

  @IsString()
  @Matches(HHMM)
  afternoonInWindowStart!: string

  @IsString()
  @Matches(HHMM)
  afternoonInWindowEnd!: string

  @IsString()
  @Matches(HHMM)
  afternoonOutWindowStart!: string

  @IsString()
  @Matches(HHMM)
  afternoonOutWindowEnd!: string

  @IsString()
  @Matches(HHMM)
  overtimeMorningNormalEnd!: string

  @IsString()
  @Matches(HHMM)
  overtimeAfternoonNormalEnd!: string
}
