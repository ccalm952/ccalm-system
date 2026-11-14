import { SetMetadata } from "@nestjs/common";

import type { Permission } from "./permissions";

export const PERMISSIONS_KEY = "required_permissions";

/** 要求当前用户拥有这些权限（全部满足）；权限取所有角色的并集 */
export function RequirePermissions(...permissions: Permission[]) {
  return SetMetadata(PERMISSIONS_KEY, permissions);
}
