import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import bcrypt from "bcrypt"

import { PrismaService } from "../../prisma/prisma.service"

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    return await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async createByAdmin(input: {
    username: string
    password: string
    displayName: string
    role: "user" | "admin"
  }) {
    const passwordHash = await bcrypt.hash(input.password, 10)
    return await this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash,
        displayName: input.displayName,
        role: input.role,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async update(params: {
    actor: { userId: string; role: "user" | "admin" }
    targetUserId: string
    displayName?: string
    password?: string
    role?: "user" | "admin"
  }) {
    const { actor, targetUserId, displayName, password, role } = params
    const isSelf = actor.userId === targetUserId
    const isAdmin = actor.role === "admin"

    if (!isSelf && !isAdmin) throw new ForbiddenException()

    const existing = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    })
    if (!existing) throw new NotFoundException("用户不存在")

    if (role && !isAdmin) throw new ForbiddenException("仅管理员可修改角色")

    const data: Record<string, unknown> = {}
    if (typeof displayName === "string") data.displayName = displayName
    if (typeof password === "string" && password.length >= 6)
      data.passwordHash = await bcrypt.hash(password, 10)
    if (role && isAdmin) data.role = role

    return await this.prisma.user.update({
      where: { id: targetUserId },
      data,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async deleteByAdmin(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } })
    return { ok: true }
  }
}
