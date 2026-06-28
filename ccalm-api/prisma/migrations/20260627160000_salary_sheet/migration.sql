-- CreateTable
CREATE TABLE "SalarySheet" (
    "month" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalarySheet_pkey" PRIMARY KEY ("month")
);
