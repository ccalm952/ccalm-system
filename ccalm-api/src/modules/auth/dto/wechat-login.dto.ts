import { IsString, MinLength } from "class-validator";

export class WechatLoginDto {
  @IsString({ message: "微信登录凭证格式不正确" })
  @MinLength(1, { message: "请提供微信登录凭证" })
  code!: string;
}
