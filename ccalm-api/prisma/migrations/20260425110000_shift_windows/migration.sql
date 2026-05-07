-- Add new window columns with defaults
ALTER TABLE "ShiftConfig"
ADD COLUMN "morningOutWindowStart" TEXT NOT NULL DEFAULT '12:00',
ADD COLUMN "morningOutWindowEnd"   TEXT NOT NULL DEFAULT '14:30',
ADD COLUMN "afternoonInWindowStart"  TEXT NOT NULL DEFAULT '14:30',
ADD COLUMN "afternoonInWindowEnd"    TEXT NOT NULL DEFAULT '18:00',
ADD COLUMN "afternoonOutWindowStart" TEXT NOT NULL DEFAULT '18:00',
ADD COLUMN "afternoonOutWindowEnd"   TEXT NOT NULL DEFAULT '23:59';

-- Migrate existing data
UPDATE "ShiftConfig"
SET
  "morningOutWindowEnd" = COALESCE("morningOutLatest", "morningOutWindowEnd"),
  "afternoonInWindowStart" = COALESCE("afternoonClockInEarliest", "afternoonInWindowStart");

-- Drop old columns
ALTER TABLE "ShiftConfig"
DROP COLUMN "morningOutLatest",
DROP COLUMN "morningFirstOrderUntil",
DROP COLUMN "afternoonClockInEarliest";

