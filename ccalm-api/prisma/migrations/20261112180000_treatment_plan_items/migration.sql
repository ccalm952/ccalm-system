-- CreateTable
CREATE TABLE "TreatmentPlanItem" (
    "id" SERIAL NOT NULL,
    "recordId" INTEGER NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "teeth" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TreatmentPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TreatmentPlanItem_recordId_idx" ON "TreatmentPlanItem"("recordId");

-- AddForeignKey
ALTER TABLE "TreatmentPlanItem" ADD CONSTRAINT "TreatmentPlanItem_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MedicalRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 迁移已有治疗计划
INSERT INTO "TreatmentPlanItem" ("recordId", "sort", "teeth", "text")
SELECT r."id", e.ord - 1, COALESCE(e.val->>'teeth', ''), COALESCE(e.val->>'text', '')
FROM "MedicalRecord" r, jsonb_array_elements(r."treatmentPlan") WITH ORDINALITY AS e(val, ord)
WHERE jsonb_typeof(r."treatmentPlan") = 'array';

-- AlterTable
ALTER TABLE "MedicalRecord" DROP COLUMN "treatmentPlan",
ADD COLUMN "completesPlanItem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "planItemId" INTEGER;

-- CreateIndex
CREATE INDEX "MedicalRecord_planItemId_idx" ON "MedicalRecord"("planItemId");

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "TreatmentPlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
