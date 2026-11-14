-- CreateTable
CREATE TABLE "FollowUp" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'postop',
    "planDate" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "doctor" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT NOT NULL DEFAULT '',
    "satisfaction" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUp_patientId_planDate_idx" ON "FollowUp"("patientId", "planDate");

-- CreateIndex
CREATE INDEX "FollowUp_status_planDate_idx" ON "FollowUp"("status", "planDate");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
