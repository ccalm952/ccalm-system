import { IsIn, IsString, Matches } from "class-validator"

export class DeclareRestDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string

  @IsString()
  @IsIn(["morning", "afternoon"])
  half!: "morning" | "afternoon"
}

export class ClearRestDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string

  @IsString()
  @IsIn(["morning", "afternoon"])
  half!: "morning" | "afternoon"
}
