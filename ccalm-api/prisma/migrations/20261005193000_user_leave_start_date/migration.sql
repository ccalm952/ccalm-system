ALTER TABLE "User" ADD COLUMN "leaveStartDate" TEXT NOT NULL DEFAULT '';

UPDATE "User"
SET "leaveStartDate" = to_char(
  ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai',
  'YYYY-MM-DD'
)
WHERE "leaveStartDate" = '';

ALTER TABLE "User" DROP COLUMN "leaveInitialBalance";
