import { IsObject, IsString, Matches } from "class-validator"

export class SaveSalarySheetDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month!: string

  @IsObject()
  data!: Record<string, unknown>
}
