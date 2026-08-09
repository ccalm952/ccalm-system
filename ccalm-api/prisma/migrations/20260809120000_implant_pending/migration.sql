-- CreateTable
CREATE TABLE "ImplantPending" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "chartNo" TEXT NOT NULL DEFAULT '',
    "teeth" TEXT NOT NULL DEFAULT '',
    "extractionDate" TEXT,
    "remark" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImplantPending_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImplantPending_name_idx" ON "ImplantPending"("name");

-- CreateIndex
CREATE INDEX "ImplantPending_phone_idx" ON "ImplantPending"("phone");
