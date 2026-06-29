import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { timingSafeEqual } from "node:crypto"

const UNLOCK_TTL_SEC = 30 * 60

@Injectable()
export class SalaryUnlockService {
  constructor(private readonly jwt: JwtService) {}

  private configuredPin(): string {
    const pin = process.env.SALARY_PIN?.trim()
    if (!pin || !/^\d{4}$/.test(pin)) {
      throw new ServiceUnavailableException(
        "未配置薪资 PIN，请在服务端环境变量设置 SALARY_PIN（4 位数字）"
      )
    }
    return pin
  }

  verifyPin(pin: string): void {
    const expected = this.configuredPin()
    if (!/^\d{4}$/.test(pin)) {
      throw new UnauthorizedException("薪资 PIN 错误")
    }
    const ok = timingSafeEqual(Buffer.from(pin), Buffer.from(expected))
    if (!ok) throw new UnauthorizedException("薪资 PIN 错误")
  }

  async issueUnlockToken(
    userId: string
  ): Promise<{ unlockToken: string; expiresAt: string }> {
    const unlockToken = await this.jwt.signAsync(
      { sub: userId, scope: "salary" },
      { expiresIn: UNLOCK_TTL_SEC }
    )
    return {
      unlockToken,
      expiresAt: new Date(Date.now() + UNLOCK_TTL_SEC * 1000).toISOString(),
    }
  }

  assertUnlocked(userId: string, token: string | undefined): void {
    if (!token?.trim()) {
      throw new ForbiddenException("请先验证薪资 PIN")
    }
    try {
      const payload = this.jwt.verify<{ sub?: string; scope?: string }>(token)
      if (payload.sub !== userId || payload.scope !== "salary") {
        throw new ForbiddenException("薪资验证已失效，请重新输入 PIN")
      }
    } catch (e) {
      if (e instanceof ForbiddenException) throw e
      throw new ForbiddenException("薪资验证已失效，请重新输入 PIN")
    }
  }
}
