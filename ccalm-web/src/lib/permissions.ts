import type { AuthMe, Permission } from "./auth";

/** 是否拥有某个权限点（多个时要求全部满足）；未登录一律 false */
export function can(
  me: AuthMe | null,
  permission: Permission | Permission[],
): boolean {
  if (!me?.permissions?.length) return false;
  const list = Array.isArray(permission) ? permission : [permission];
  return list.every((p) => me.permissions!.includes(p));
}
