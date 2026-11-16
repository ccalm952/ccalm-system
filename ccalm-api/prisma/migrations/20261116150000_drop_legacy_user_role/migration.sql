-- 旧的 User.role（user/admin）已完全由 Role 多角色模型取代：
-- 员工身份与权限只来自 _RoleToUser / Role，不再保留兼容字段。
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";

DROP TYPE IF EXISTS "UserRole";
