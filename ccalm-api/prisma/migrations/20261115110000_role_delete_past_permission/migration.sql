-- 内置管理员角色补「删除历史预约」权限
UPDATE "Role"
SET "permissions" = array_append("permissions", 'appointment.delete_past')
WHERE "id" = 'builtin-admin'
  AND NOT ('appointment.delete_past' = ANY("permissions"));