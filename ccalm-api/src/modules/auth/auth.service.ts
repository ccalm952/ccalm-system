import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import bcrypt from "bcrypt"

import { PrismaService } from "../../prisma/prisma.service"

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  private async signUser(user: {
    id: string
    username: string
    role: "user" | "admin"
  }): Promise<string> {
    return await this.jwt.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
    })
  }

  async login(username: string, password: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { username } })
    if (!user) throw new UnauthorizedException("用户名或密码错误")
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new UnauthorizedException("用户名或密码错误")
    return await this.signUser(user)
  }

  async getUserSafe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!user) throw new UnauthorizedException()
    return user
  }

  async switchUser(actor: Express.User, targetUserId: string) {
    if (actor.role !== "user" && actor.role !== "admin")
      throw new ForbiddenException("无权切换用户")
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!user) throw new NotFoundException("用户不存在")
    if (user.role !== "user")
      throw new ForbiddenException("不能切换到管理员账户")
    const accessToken = await this.signUser(user)
    return { accessToken, user }
  }
}
