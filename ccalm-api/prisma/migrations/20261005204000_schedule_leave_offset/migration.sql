-- CreateTable
CREATE TABLE "ScheduleLeaveOffset" (
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleLeaveOffset_pkey" PRIMARY KEY ("userId","month")
);

-- CreateIndex
CREATE INDEX "ScheduleLeaveOffset_month_idx" ON "ScheduleLeaveOffset"("month");

-- AddForeignKey
ALTER TABLE "ScheduleLeaveOffset" ADD CONSTRAINT "ScheduleLeaveOffset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
