-- CreateTable
CREATE TABLE "PlanItemFollowUp" (
    "recordId" INTEGER NOT NULL,
    "planItemId" INTEGER NOT NULL,
    "completes" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlanItemFollowUp_pkey" PRIMARY KEY ("recordId","planItemId")
);

-- CreateIndex
CREATE INDEX "PlanItemFollowUp_planItemId_idx" ON "PlanItemFollowUp"("planItemId");

-- AddForeignKey
ALTER TABLE "PlanItemFollowUp" ADD CONSTRAINT "PlanItemFollowUp_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanItemFollowUp" ADD CONSTRAINT "PlanItemFollowUp_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "TreatmentPlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 迁移已有复诊关联
INSERT INTO "PlanItemFollowUp" ("recordId", "planItemId", "completes")
SELECT "id", "planItemId", "completesPlanItem"
FROM "MedicalRecord"
WHERE "planItemId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "MedicalRecord" DROP CONSTRAINT "MedicalRecord_planItemId_fkey";

-- DropIndex
DROP INDEX "MedicalRecord_planItemId_idx";

-- AlterTable
ALTER TABLE "MedicalRecord" DROP COLUMN "completesPlanItem",
DROP COLUMN "planItemId";
