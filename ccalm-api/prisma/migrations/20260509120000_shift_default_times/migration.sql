-- Align ShiftConfig column defaults with application DEFAULT_SHIFT_ROW (no data UPDATE).

ALTER TABLE "ShiftConfig" ALTER COLUMN "morningLabel" SET DEFAULT '上午';
ALTER TABLE "ShiftConfig" ALTER COLUMN "afternoonLabel" SET DEFAULT '下午';
ALTER TABLE "ShiftConfig" ALTER COLUMN "morningInWindowStart" SET DEFAULT '08:25';
ALTER TABLE "ShiftConfig" ALTER COLUMN "morningInWindowEnd" SET DEFAULT '09:00';
ALTER TABLE "ShiftConfig" ALTER COLUMN "morningOutWindowStart" SET DEFAULT '11:00';
ALTER TABLE "ShiftConfig" ALTER COLUMN "morningOutWindowEnd" SET DEFAULT '14:20';
ALTER TABLE "ShiftConfig" ALTER COLUMN "afternoonInWindowStart" SET DEFAULT '14:25';
ALTER TABLE "ShiftConfig" ALTER COLUMN "afternoonInWindowEnd" SET DEFAULT '15:00';
ALTER TABLE "ShiftConfig" ALTER COLUMN "afternoonOutWindowStart" SET DEFAULT '17:00';
ALTER TABLE "ShiftConfig" ALTER COLUMN "afternoonOutWindowEnd" SET DEFAULT '20:20';
