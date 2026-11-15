import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

export type RoleBrief = {
  id: string;
  name: string;
  bookable: boolean;
  assistable: boolean;
};

export type UserPermissions = {
  roles: RoleBrief[];
  permissions: string[];
  /** 任一角色可被预约（预约医生下拉/看板医生列） */
  bookable: boolean;
  /** 任一角色可配台（病历配台护士选人） */
  assistable: boolean;
};

const CACHE_TTL_MS = 30_000;

@Injectable()
export class PermissionsService {
  private readonly cache = new Map<
    string,
    { at: number; value: UserPermissions }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string): Promise<UserPermissions> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          select: {
            id: true,
            name: true,
            bookable: true,
            assistable: true,
            permissions: true,
          },
        },
      },
    });

    const roles: RoleBrief[] = (user?.roles ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      bookable: r.bookable,
      assistable: r.assistable,
    }));
    const permissions = [
      ...new Set((user?.roles ?? []).flatMap((r) => r.permissions)),
    ];

    const value: UserPermissions = {
      roles,
      permissions,
      bookable: roles.some((r) => r.bookable),
      assistable: roles.some((r) => r.assistable),
    };
    this.cache.set(userId, { at: Date.now(), value });
    return value;
  }

  async has(userId: string, permission: string): Promise<boolean> {
    const { permissions } = await this.forUser(userId);
    return permissions.includes(permission);
  }

  invalidate(userId?: string) {
    if (userId) this.cache.delete(userId);
    else this.cache.clear();
  }
}
