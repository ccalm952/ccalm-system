CREATE TABLE "AppointmentSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "workStart" TEXT NOT NULL DEFAULT '08:30',
    "workEnd" TEXT NOT NULL DEFAULT '18:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppointmentSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AppointmentSettings" ("id", "workStart", "workEnd", "updatedAt")
VALUES ('global', '08:30', '18:00', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;