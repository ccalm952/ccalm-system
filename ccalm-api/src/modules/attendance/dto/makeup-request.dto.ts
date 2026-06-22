import { IsIn, IsString, Matches, MinLength } from "class-validator"

export class CreateMakeupRequestDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string

  @IsString()
  @IsIn(["morning_out", "afternoon_out"])
  type!: "morning_out" | "afternoon_out"

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  time!: string

  @IsString()
  @MinLength(1)
  reason!: string
}

export class RejectMakeupRequestDto {
  @IsString()
  @MinLength(1)
  rejectReason!: string
}

export class AdminMakeupDto {
  @IsString()
  userId!: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string

  @IsString()
  @IsIn(["morning_out", "afternoon_out"])
  type!: "morning_out" | "afternoon_out"

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  time!: string
}
