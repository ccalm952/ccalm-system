-- 预约看板基础表：角色/权限、预约项目字典、就诊预约字段
-- 注意：本迁移包含数据回填（角色映射、配台护士合并、就诊状态收敛），顺序不可调换

-- 1) 角色（= 岗位身份 + 权限点）
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bookable" BOOLEAN NOT NULL DEFAULT false,
    "assistable" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "builtin" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_RoleToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RoleToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- 2) 预约项目字典
CREATE TABLE "AppointmentCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppointmentCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppointmentItem" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppointmentItem_pkey" PRIMARY KEY ("id")
);

-- 3) 就诊增加预约字段
ALTER TABLE "PatientVisit"
    ADD COLUMN "arrivedAt" TIMESTAMP(3),
    ADD COLUMN "cancelReason" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "completedAt" TIMESTAMP(3),
    ADD COLUMN "createdById" TEXT,
    ADD COLUMN "isPending" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "items" TEXT[] DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "pendingReason" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual',
    ALTER COLUMN "status" SET DEFAULT 'booked';

-- 4) 索引与约束
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
CREATE UNIQUE INDEX "AppointmentCategory_name_key" ON "AppointmentCategory"("name");
CREATE INDEX "AppointmentItem_categoryId_sort_idx" ON "AppointmentItem"("categoryId", "sort");
CREATE UNIQUE INDEX "AppointmentItem_categoryId_name_key" ON "AppointmentItem"("categoryId", "name");
CREATE INDEX "_RoleToUser_B_index" ON "_RoleToUser"("B");
CREATE INDEX "PatientVisit_visitDate_status_idx" ON "PatientVisit"("visitDate", "status");
CREATE INDEX "PatientVisit_visitDate_doctor_idx" ON "PatientVisit"("visitDate", "doctor");
CREATE INDEX "PatientVisit_isPending_visitDate_idx" ON "PatientVisit"("isPending", "visitDate");

ALTER TABLE "AppointmentItem" ADD CONSTRAINT "AppointmentItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AppointmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_RoleToUser" ADD CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_RoleToUser" ADD CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) 内置角色（id 固定，便于代码/脚本引用）
INSERT INTO "Role" ("id", "name", "bookable", "assistable", "permissions", "builtin", "sortOrder", "updatedAt") VALUES
('builtin-admin', '管理员', false, false, ARRAY[
  'appointment.view','appointment.create','appointment.edit_any','appointment.delete','appointment.export',
  'appointment.pending','appointment.settings',
  'patient.view','patient.edit','record.view','record.edit','charge.view','charge.edit',
  'salary.view','staff.manage','attendance.manage','report.view','warehouse.manage'
], true, 0, NOW()),
('builtin-doctor', '医生', true, false, ARRAY[
  'appointment.view','appointment.create','appointment.edit_any','appointment.pending',
  'patient.view','patient.edit','record.view','record.edit','charge.view','charge.edit','report.view'
], true, 1, NOW()),
('builtin-nurse', '护士', false, true, ARRAY[
  'appointment.view','appointment.create','appointment.edit_any','appointment.pending',
  'patient.view','record.view','charge.view'
], true, 2, NOW());

-- 6) 迁移现有用户：admin -> 管理员，其余 -> 医生（上线后人工调整护士）
INSERT INTO "_RoleToUser" ("A", "B")
SELECT 'builtin-admin', "id" FROM "User" WHERE "role" = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO "_RoleToUser" ("A", "B")
SELECT 'builtin-doctor', "id" FROM "User" WHERE "role" <> 'admin'
ON CONFLICT DO NOTHING;

-- 7) 病历：assistant 并入 nurse（nurse 为空才覆盖），然后删除 assistant
UPDATE "MedicalRecord"
SET "nurse" = "assistant"
WHERE COALESCE("nurse", '') = '' AND COALESCE("assistant", '') <> '';

ALTER TABLE "MedicalRecord" DROP COLUMN "assistant";

-- 8) 就诊状态收敛：arrived -> completed（已挂病历）/ booked（未挂病历）
UPDATE "PatientVisit" p
SET "status" = 'completed'
WHERE p."status" = 'arrived'
  AND EXISTS (SELECT 1 FROM "MedicalRecord" m WHERE m."visitId" = p."id");

UPDATE "PatientVisit"
SET "status" = 'booked'
WHERE "status" = 'arrived';

-- 9) 默认预约项目分类（可在「预约设置」里增删）
INSERT INTO "AppointmentCategory" ("name", "sort", "updatedAt") VALUES
('定期复诊', 0, NOW()),
('口腔检查', 1, NOW()),
('牙体', 2, NOW()),
('口外', 3, NOW()),
('修复', 4, NOW()),
('种植', 5, NOW()),
('正畸', 6, NOW()),
('牙周', 7, NOW());
