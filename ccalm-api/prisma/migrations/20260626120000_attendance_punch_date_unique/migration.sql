-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN "punchDate" TEXT;

-- Backfill from punchTime (server-local calendar date)
UPDATE "AttendanceRecord" SET "punchDate" = TO_CHAR("punchTime", 'YYYY-MM-DD');

-- Deduplicate: keep the earliest created record per (userId, type, punchDate)
DELETE FROM "AttendanceRecord" AS a
USING "AttendanceRecord" AS b
WHERE a.id <> b.id
  AND a."userId" = b."userId"
  AND a."type" = b."type"
  AND a."punchDate" = b."punchDate"
  AND a."createdAt" > b."createdAt";

ALTER TABLE "AttendanceRecord" ALTER COLUMN "punchDate" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_userId_type_punchDate_key" ON "AttendanceRecord"("userId", "type", "punchDate");

-- CreateIndex
CREATE INDEX "AttendanceRecord_userId_punchDate_idx" ON "AttendanceRecord"("userId", "punchDate");
