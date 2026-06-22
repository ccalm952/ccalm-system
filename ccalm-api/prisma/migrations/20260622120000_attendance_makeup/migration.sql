-- CreateEnum
CREATE TYPE "AttendanceRecordSource" AS ENUM ('normal', 'makeup');

-- CreateEnum
CREATE TYPE "AttendanceMakeupRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN "source" "AttendanceRecordSource" NOT NULL DEFAULT 'normal';

-- CreateTable
CREATE TABLE "AttendanceMakeupRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" "AttendancePunchType" NOT NULL,
    "punchTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AttendanceMakeupRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceMakeupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceMakeupRequest_userId_date_idx" ON "AttendanceMakeupRequest"("userId", "date");

-- CreateIndex
CREATE INDEX "AttendanceMakeupRequest_status_createdAt_idx" ON "AttendanceMakeupRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AttendanceMakeupRequest" ADD CONSTRAINT "AttendanceMakeupRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceMakeupRequest" ADD CONSTRAINT "AttendanceMakeupRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
