import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import bcrypt from "bcrypt";
import { unlink } from "node:fs/promises";
import path from "node:path";

import { API_ROOT } from "../../common/api-root";
import { PermissionsService } from "../../common/permissions/permissions.service";
import { PrismaService } from "../../prisma/prisma.service";

const avatarUrlPrefix = "/api/uploads/avatars/";
const avatarUploadDir = path.join(API_ROOT, "uploads", "avatars");

const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  leaveInitialBalance: true,
  createdAt: true,
  updatedAt: true,
  roles: { select: { id: true, name: true, bookable: true, assistable: true } },
} as const;

async function removeLocalAvatarFile(avatarUrl: string | null | undefined) {
  if (!avatarUrl?.startsWith(avatarUrlPrefix)) return;
  const filename = avatarUrl.slice(avatarUrlPrefix.length);
  if (
    !filename ||
    filename.includes("/") ||
    filename.includes("\\") ||
    filename.includes("..")
  ) {
    return;
  }
  try {
    await unlink(path.join(avatarUploadDir, filename));
  } catch {
    // 旧文件缺失或删除失败不影响本次上传
  }
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async listAll() {
    return await this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: USER_SELECT,
    });
  }

  /** 角色 id 校验 + 至少保留一个「人员管理」用户 */
  private async normalizeRoleIds(raw: string[] | undefined) {
    if (!raw) return undefined;
    const roleIds = [...new Set(raw)];
    if (!roleIds.length) throw new BadRequestException("请至少选择一个角色");
    const found = await this.prisma.role.count({
      where: { id: { in: roleIds } },
    });
    if (found !== roleIds.length)
      throw new BadRequestException("所选角色不存在");
    return roleIds;
  }

  private async assertStaffManageRemains(excludeUserId?: string) {
    const count = await this.prisma.user.count({
      where: {
        id: excludeUserId ? { not: excludeUserId } : undefined,
        roles: { some: { permissions: { has: "staff.manage" } } },
      },
    });
    if (count === 0) {
      throw new BadRequestException("至少要保留一个拥有「人员管理」权限的用户");
    }
  }

  async createByAdmin(input: {
    username: string;
    password: string;
    displayName: string;
    roleIds: string[];
  }) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const last = await this.prisma.user.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const roleIds = await this.normalizeRoleIds(input.roleIds);
    if (!roleIds) throw new BadRequestException("请至少选择一个角色");
    return await this.prisma.user.create({
      data: {
        username: input.username,
        passwordHash,
        displayName: input.displayName,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        roles: { connect: roleIds.map((id) => ({ id })) },
      },
      select: USER_SELECT,
    });
  }

  async update(params: {
    actorUserId: string;
    canManage: boolean;
    targetUserId: string;
    displayName?: string;
    password?: string;
    roleIds?: string[];
    leaveInitialBalance?: number;
  }) {
    const { actorUserId, canManage, targetUserId } = params;
    const isSelf = actorUserId === targetUserId;
    if (!isSelf && !canManage) throw new ForbiddenException("无权限");

    const existing = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("用户不存在");

    if (params.roleIds !== undefined && !canManage) {
      throw new ForbiddenException("仅拥有人员管理权限的用户可修改角色");
    }
    if (params.leaveInitialBalance !== undefined && !canManage) {
      throw new ForbiddenException("仅拥有人员管理权限的用户可修改假期余额");
    }

    const data: Record<string, unknown> = {};
    if (typeof params.displayName === "string")
      data.displayName = params.displayName;
    if (typeof params.password === "string" && params.password.length >= 6)
      data.passwordHash = await bcrypt.hash(params.password, 10);

    const roleIds = await this.normalizeRoleIds(params.roleIds);
    if (roleIds) {
      // 新角色里没有 staff.manage 时，确认还有别人能管，避免把最后一个管理员降掉
      if (!(await this.rolesGrantStaffManage(roleIds))) {
        await this.assertStaffManageRemains(targetUserId);
      }
      data.roles = { set: roleIds.map((id) => ({ id })) };
    }
    if (typeof params.leaveInitialBalance === "number" && canManage) {
      data.leaveInitialBalance = params.leaveInitialBalance;
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data,
      select: USER_SELECT,
    });
    this.permissions.invalidate(targetUserId);
    return updated;
  }

  private async rolesGrantStaffManage(roleIds: string[]) {
    const count = await this.prisma.role.count({
      where: { id: { in: roleIds }, permissions: { has: "staff.manage" } },
    });
    return count > 0;
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });
    if (!existing) throw new NotFoundException("用户不存在");

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: USER_SELECT,
    });

    if (existing.avatarUrl && existing.avatarUrl !== avatarUrl) {
      await removeLocalAvatarFile(existing.avatarUrl);
    }
    return updated;
  }

  async deleteByAdmin(params: { actorUserId: string; targetUserId: string }) {
    const { actorUserId, targetUserId } = params;
    if (actorUserId === targetUserId) {
      throw new BadRequestException("不能删除当前登录用户");
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        roles: { select: { permissions: true } },
      },
    });
    if (!existing) throw new NotFoundException("用户不存在");

    const hasStaffManage = existing.roles.some((r) =>
      r.permissions.includes("staff.manage"),
    );
    if (hasStaffManage) await this.assertStaffManageRemains(targetUserId);

    await this.prisma.user.delete({ where: { id: targetUserId } });
    this.permissions.invalidate(targetUserId);
    return { ok: true };
  }
}
