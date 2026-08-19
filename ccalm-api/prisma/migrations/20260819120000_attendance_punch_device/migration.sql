-- CreateTable
CREATE TABLE "AttendancePunchDevice" (
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "boundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendancePunchDevice_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "AttendancePunchDevice" ADD CONSTRAINT "AttendancePunchDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
