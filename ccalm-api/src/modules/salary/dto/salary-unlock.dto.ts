import { IsString, MinLength } from "class-validator"

export class SalaryUnlockDto {
  @IsString({ message: "密码格式不正确" })
  @MinLength(1, { message: "密码不能为空" })
  password!: string
}
