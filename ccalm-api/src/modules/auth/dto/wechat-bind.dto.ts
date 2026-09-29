import { IsString, MinLength } from "class-validator"

export class WechatBindDto {
  @IsString({ message: "绑定凭证格式不正确" })
  @MinLength(1, { message: "请提供绑定凭证" })
  bindTicket!: string

  @IsString({ message: "账号格式不正确" })
  @MinLength(1, { message: "请填写账号" })
  username!: string

  @IsString({ message: "密码格式不正确" })
  @MinLength(6, { message: "密码长度须不少于 6 个字符" })
  password!: string
}
