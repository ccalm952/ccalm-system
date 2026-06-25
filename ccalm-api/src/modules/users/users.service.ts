import {
  BadRequestException,
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
        avatarUrl: true,
        role: true,
        leaveInitialBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async listSwitchableUsers() {
    return await this.prisma.user.findMany({
      where: { role: "user" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        leaveInitialBalance: true,
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
    leaveInitialBalance?: number
  }) {
    const passwordHash = await bcrypt.hash(input.password, 10)
    return await this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash,
        displayName: input.displayName,
        role: input.role,
        leaveInitialBalance:
          input.role === "user" && typeof input.leaveInitialBalance === "number"
            ? input.leaveInitialBalance
            : 0,
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        leaveInitialBalance: true,
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
    leaveInitialBalance?: number
  }) {
    const {
      actor,
      targetUserId,
      displayName,
      password,
      role,
      leaveInitialBalance,
    } = params
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
    if (typeof leaveInitialBalance === "number" && isAdmin)
      data.leaveInitialBalance = leaveInitialBalance

    return await this.prisma.user.update({
      where: { id: targetUserId },
      data,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        leaveInitialBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        leaveInitialBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async deleteByAdmin(params: { actorUserId: string; targetUserId: string }) {
    const { actorUserId, targetUserId } = params
    if (actorUserId === targetUserId) {
      throw new BadRequestException("不能删除当前登录用户")
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true },
    })
    if (!existing) throw new NotFoundException("用户不存在")

    if (existing.role === "admin") {
      const adminCount = await this.prisma.user.count({
        where: { role: "admin" },
      })
      if (adminCount <= 1) {
        throw new BadRequestException("至少保留一个管理员")
      }
    }

    await this.prisma.user.delete({ where: { id: targetUserId } })
    return { ok: true }
  }
}
