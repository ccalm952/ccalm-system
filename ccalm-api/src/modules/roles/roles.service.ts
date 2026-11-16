import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { ALL_PERMISSIONS } from "../../common/permissions/permissions";
import { PermissionsService } from "../../common/permissions/permissions.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SaveRoleDto } from "./dto/save-role.dto";

const STAFF_MANAGE = "staff.manage";

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  private normalizePermissions(raw?: string[]): string[] {
    if (!raw) return [];
    const allowed = new Set(ALL_PERMISSIONS);
    const invalid = raw.filter((p) => !allowed.has(p));
    if (invalid.length) {
      throw new BadRequestException(`未知权限点：${invalid.join("、")}`);
    }
    return [...new Set(raw)];
  }

  async list() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { users: true } } },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      bookable: r.bookable,
      assistable: r.assistable,
      permissions: r.permissions,
      builtin: r.builtin,
      sortOrder: r.sortOrder,
      userCount: r._count.users,
    }));
  }

  /** 至少保留一个拥有 staff.manage 的用户，避免把自己锁死 */
  private async assertStaffManageRemains() {
    const count = await this.prisma.user.count({
      where: {
        roles: { some: { permissions: { has: STAFF_MANAGE } } },
      },
    });
    if (count === 0) {
      throw new BadRequestException("至少要保留一个拥有「人员管理」权限的用户");
    }
  }

  async create(dto: SaveRoleDto) {
    const name = dto.name.trim();
    const exists = await this.prisma.role.findUnique({ where: { name } });
    if (exists) throw new BadRequestException("角色名称已存在");

    const role = await this.prisma.role.create({
      data: {
        name,
        bookable: dto.bookable ?? false,
        assistable: dto.assistable ?? false,
        permissions: this.normalizePermissions(dto.permissions),
        sortOrder: dto.sortOrder ? Number(dto.sortOrder) : 10,
      },
    });
    this.permissions.invalidate();
    return role;
  }

  async update(id: string, dto: SaveRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("角色不存在");

    const name = dto.name.trim();
    if (existing.builtin && name !== existing.name) {
      throw new BadRequestException("内置角色不能改名");
    }
    if (!existing.builtin && name !== existing.name) {
      const dup = await this.prisma.role.findUnique({ where: { name } });
      if (dup) throw new BadRequestException("角色名称已存在");
    }

    const permissions = dto.permissions
      ? this.normalizePermissions(dto.permissions)
      : existing.permissions;

    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: {
          name: existing.builtin ? existing.name : name,
          bookable: dto.bookable ?? existing.bookable,
          assistable: dto.assistable ?? existing.assistable,
          permissions,
          sortOrder:
            dto.sortOrder != null ? Number(dto.sortOrder) : existing.sortOrder,
        },
      });
      // 事务内校验，失败即回滚
      await this.assertStaffManageRemains();
    });

    this.permissions.invalidate();
    return { ok: true };
  }

  async remove(id: string) {
    const existing = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) throw new NotFoundException("角色不存在");
    if (existing.builtin) throw new BadRequestException("内置角色不能删除");
    if (existing._count.users > 0) {
      throw new BadRequestException("该角色下还有员工，请先调整员工角色");
    }

    await this.prisma.role.delete({ where: { id } });
    this.permissions.invalidate();
    return { ok: true };
  }
}
