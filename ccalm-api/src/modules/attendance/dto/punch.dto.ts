import { IsIn, IsNumber, IsOptional, IsString } from "class-validator"

export class PunchDto {
  @IsString()
  @IsIn(["morning_in", "morning_out", "afternoon_in", "afternoon_out"])
  type!: "morning_in" | "morning_out" | "afternoon_in" | "afternoon_out"

  @IsNumber()
  latitude!: number

  @IsNumber()
  longitude!: number

  @IsOptional()
  @IsString()
  address?: string
}
