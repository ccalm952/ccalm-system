-- 内置管理员角色补「导入 e看牙」权限
UPDATE "Role"
SET "permissions" = array_append("permissions", 'patient.import_ekqy')
WHERE "id" = 'builtin-admin'
  AND NOT ('patient.import_ekqy' = ANY("permissions"));
