-- Global singleton: GeofenceConfig / ShiftConfig (one row id = 'global'), no per-user FK.

ALTER TABLE "GeofenceConfig" DROP CONSTRAINT IF EXISTS "GeofenceConfig_ownerUserId_fkey";
DROP INDEX IF EXISTS "GeofenceConfig_ownerUserId_key";

CREATE TABLE "GeofenceConfig_new" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusM" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GeofenceConfig_new_pkey" PRIMARY KEY ("id")
);

INSERT INTO "GeofenceConfig_new" ("id", "enabled", "centerLat", "centerLng", "radiusM", "label", "createdAt", "updatedAt")
SELECT 'global', g."enabled", g."centerLat", g."centerLng", g."radiusM", g."label", g."createdAt", g."updatedAt"
FROM "GeofenceConfig" g
ORDER BY g."updatedAt" DESC
LIMIT 1;

INSERT INTO "GeofenceConfig_new" ("id", "enabled", "centerLat", "centerLng", "radiusM", "label", "createdAt", "updatedAt")
SELECT 'global', false, 39.9042, 116.4074, 200, '门诊大楼', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "GeofenceConfig_new" WHERE "id" = 'global');

DROP TABLE "GeofenceConfig";
ALTER TABLE "GeofenceConfig_new" RENAME TO "GeofenceConfig";

-- ShiftConfig
ALTER TABLE "ShiftConfig" DROP CONSTRAINT IF EXISTS "ShiftConfig_ownerUserId_fkey";
DROP INDEX IF EXISTS "ShiftConfig_ownerUserId_key";

CREATE TABLE "ShiftConfig_new" (
    "id" TEXT NOT NULL,
    "morningLabel" TEXT NOT NULL DEFAULT '上午班',
    "morningRangeStart" TEXT NOT NULL DEFAULT '08:30',
    "morningRangeEnd" TEXT NOT NULL DEFAULT '12:00',
    "afternoonLabel" TEXT NOT NULL DEFAULT '下午班',
    "afternoonRangeStart" TEXT NOT NULL DEFAULT '14:30',
    "afternoonRangeEnd" TEXT NOT NULL DEFAULT '18:00',
    "morningInWindowStart" TEXT NOT NULL DEFAULT '08:30',
    "morningInWindowEnd" TEXT NOT NULL DEFAULT '12:00',
    "morningOutWindowStart" TEXT NOT NULL DEFAULT '12:00',
    "morningOutWindowEnd" TEXT NOT NULL DEFAULT '14:30',
    "afternoonInWindowStart" TEXT NOT NULL DEFAULT '14:30',
    "afternoonInWindowEnd" TEXT NOT NULL DEFAULT '18:00',
    "afternoonOutWindowStart" TEXT NOT NULL DEFAULT '18:00',
    "afternoonOutWindowEnd" TEXT NOT NULL DEFAULT '23:59',
    "overtimeMorningNormalEnd" TEXT NOT NULL DEFAULT '12:00',
    "overtimeAfternoonNormalEnd" TEXT NOT NULL DEFAULT '18:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShiftConfig_new_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ShiftConfig_new" (
    "id",
    "morningLabel",
    "morningRangeStart",
    "morningRangeEnd",
    "afternoonLabel",
    "afternoonRangeStart",
    "afternoonRangeEnd",
    "morningInWindowStart",
    "morningInWindowEnd",
    "morningOutWindowStart",
    "morningOutWindowEnd",
    "afternoonInWindowStart",
    "afternoonInWindowEnd",
    "afternoonOutWindowStart",
    "afternoonOutWindowEnd",
    "overtimeMorningNormalEnd",
    "overtimeAfternoonNormalEnd",
    "createdAt",
    "updatedAt"
)
SELECT
    'global',
    s."morningLabel",
    s."morningRangeStart",
    s."morningRangeEnd",
    s."afternoonLabel",
    s."afternoonRangeStart",
    s."afternoonRangeEnd",
    s."morningInWindowStart",
    s."morningInWindowEnd",
    s."morningOutWindowStart",
    s."morningOutWindowEnd",
    s."afternoonInWindowStart",
    s."afternoonInWindowEnd",
    s."afternoonOutWindowStart",
    s."afternoonOutWindowEnd",
    s."overtimeMorningNormalEnd",
    s."overtimeAfternoonNormalEnd",
    s."createdAt",
    s."updatedAt"
FROM "ShiftConfig" s
ORDER BY s."updatedAt" DESC
LIMIT 1;

INSERT INTO "ShiftConfig_new" (
    "id",
    "morningLabel",
    "morningRangeStart",
    "morningRangeEnd",
    "afternoonLabel",
    "afternoonRangeStart",
    "afternoonRangeEnd",
    "morningInWindowStart",
    "morningInWindowEnd",
    "morningOutWindowStart",
    "morningOutWindowEnd",
    "afternoonInWindowStart",
    "afternoonInWindowEnd",
    "afternoonOutWindowStart",
    "afternoonOutWindowEnd",
    "overtimeMorningNormalEnd",
    "overtimeAfternoonNormalEnd",
    "createdAt",
    "updatedAt"
)
SELECT
    'global',
    '上午班',
    '08:30',
    '12:00',
    '下午班',
    '14:30',
    '18:00',
    '08:30',
    '12:00',
    '12:00',
    '14:30',
    '14:30',
    '18:00',
    '18:00',
    '23:59',
    '12:00',
    '18:00',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ShiftConfig_new" WHERE "id" = 'global');

DROP TABLE "ShiftConfig";
ALTER TABLE "ShiftConfig_new" RENAME TO "ShiftConfig";
