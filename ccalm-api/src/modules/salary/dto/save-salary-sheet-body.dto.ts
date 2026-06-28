import { IsObject } from "class-validator"

export class SaveSalarySheetBodyDto {
  @IsObject()
  data!: Record<string, unknown>
}
