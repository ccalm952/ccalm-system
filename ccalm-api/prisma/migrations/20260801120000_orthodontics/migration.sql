-- CreateEnum
CREATE TYPE "OrthodonticsCategory" AS ENUM ('active', 'appliance', 'removed');

-- CreateTable
CREATE TABLE "OrthodonticsPatient" (
    "id" SERIAL NOT NULL,
    "category" "OrthodonticsCategory" NOT NULL,
    "chartNo" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "applianceModel" TEXT NOT NULL DEFAULT '',
    "lastVisitDate" TEXT,
    "followUp" TEXT NOT NULL DEFAULT '',
    "remark" TEXT NOT NULL DEFAULT '',
    "doctor" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrthodonticsPatient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrthodonticsPatient_category_idx" ON "OrthodonticsPatient"("category");

-- CreateIndex
CREATE INDEX "OrthodonticsPatient_name_idx" ON "OrthodonticsPatient"("name");

-- CreateIndex
CREATE INDEX "OrthodonticsPatient_lastVisitDate_idx" ON "OrthodonticsPatient"("lastVisitDate");
