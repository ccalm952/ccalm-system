-- CreateTable
CREATE TABLE "AttendancePunchDeviceUnbindRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AttendanceMakeupRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePunchDeviceUnbindRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendancePunchDeviceUnbindRequest_userId_status_createdAt_idx" ON "AttendancePunchDeviceUnbindRequest"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AttendancePunchDeviceUnbindRequest_status_createdAt_idx" ON "AttendancePunchDeviceUnbindRequest"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "AttendancePunchDeviceUnbindRequest" ADD CONSTRAINT "AttendancePunchDeviceUnbindRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePunchDeviceUnbindRequest" ADD CONSTRAINT "AttendancePunchDeviceUnbindRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
