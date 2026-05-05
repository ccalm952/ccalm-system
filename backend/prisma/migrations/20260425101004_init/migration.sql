-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AttendancePunchType" AS ENUM ('morning_in', 'morning_out', 'afternoon_in', 'afternoon_out');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceConfig" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusM" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeofenceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftConfig" (
    "id" TEXT NOT NULL,
    "morningLabel" TEXT NOT NULL DEFAULT '上午班',
    "morningRangeStart" TEXT NOT NULL DEFAULT '08:30',
    "morningRangeEnd" TEXT NOT NULL DEFAULT '12:00',
    "afternoonLabel" TEXT NOT NULL DEFAULT '下午班',
    "afternoonRangeStart" TEXT NOT NULL DEFAULT '14:30',
    "afternoonRangeEnd" TEXT NOT NULL DEFAULT '18:00',
    "morningInWindowStart" TEXT NOT NULL DEFAULT '08:30',
    "morningInWindowEnd" TEXT NOT NULL DEFAULT '12:00',
    "morningOutLatest" TEXT NOT NULL DEFAULT '14:30',
    "morningFirstOrderUntil" TEXT NOT NULL DEFAULT '13:00',
    "afternoonClockInEarliest" TEXT NOT NULL DEFAULT '14:30',
    "overtimeMorningNormalEnd" TEXT NOT NULL DEFAULT '12:00',
    "overtimeAfternoonNormalEnd" TEXT NOT NULL DEFAULT '18:00',
    "ownerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AttendancePunchType" NOT NULL,
    "punchTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "GeofenceConfig_ownerUserId_key" ON "GeofenceConfig"("ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftConfig_ownerUserId_key" ON "ShiftConfig"("ownerUserId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_userId_punchTime_idx" ON "AttendanceRecord"("userId", "punchTime");

-- CreateIndex
CREATE INDEX "AttendanceRecord_type_punchTime_idx" ON "AttendanceRecord"("type", "punchTime");

-- AddForeignKey
ALTER TABLE "GeofenceConfig" ADD CONSTRAINT "GeofenceConfig_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftConfig" ADD CONSTRAINT "ShiftConfig_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
