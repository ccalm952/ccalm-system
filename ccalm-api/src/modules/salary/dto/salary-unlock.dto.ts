import { IsString, Matches } from "class-validator"

export class SalaryUnlockDto {
  @IsString({ message: "PIN 格式不正确" })
  @Matches(/^\d{4}$/, { message: "请输入 4 位数字 PIN" })
  pin!: string
}
