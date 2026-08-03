import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { timingSafeEqual } from "node:crypto"

const UNLOCK_TTL_SEC = 30 * 60

@Injectable()
export class SalaryUnlockService {
  constructor(private readonly jwt: JwtService) {}

  private configuredPassword(): string {
    const password = process.env.SALARY_PIN?.trim()
    if (!password) {
      throw new ServiceUnavailableException(
        "未配置薪资密码，请在服务端环境变量设置 SALARY_PIN"
      )
    }
    return password
  }

  verifyPassword(password: string): void {
    const expected = this.configuredPassword()
    const left = Buffer.from(password)
    const right = Buffer.from(expected)
    if (left.length !== right.length) {
      throw new ForbiddenException("密码错误")
    }
    const ok = timingSafeEqual(left, right)
    if (!ok) throw new ForbiddenException("密码错误")
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
      throw new ForbiddenException("请先验证薪资密码")
    }
    try {
      const payload = this.jwt.verify<{ sub?: string; scope?: string }>(token)
      if (payload.sub !== userId || payload.scope !== "salary") {
        throw new ForbiddenException("薪资验证已失效，请重新输入密码")
      }
    } catch (e) {
      if (e instanceof ForbiddenException) throw e
      throw new ForbiddenException("薪资验证已失效，请重新输入密码")
    }
  }
}
