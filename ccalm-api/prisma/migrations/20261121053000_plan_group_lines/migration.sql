-- 计划组内收费明细
CREATE TABLE "TreatmentPlanLine" (
    "id" SERIAL NOT NULL,
    "planItemId" INTEGER NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "feeItemId" INTEGER,
    "name" TEXT NOT NULL DEFAULT '',
    "teeth" TEXT NOT NULL DEFAULT '',
    "unitPrice" DOUBLE PRECISION,
    "quantity" INTEGER,
    "discountNote" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TreatmentPlanLine_pkey" PRIMARY KEY ("id")
);

-- 旧扁平行 → 一组一条明细（文案进 name，feeItemId 暂空）
INSERT INTO "TreatmentPlanLine" ("planItemId", "sort", "feeItemId", "name", "teeth", "unitPrice", "quantity", "discountNote")
SELECT "id", 0, NULL, "text", '', "unitPrice", "quantity", "discountNote"
FROM "TreatmentPlanItem";

ALTER TABLE "TreatmentPlanItem" DROP COLUMN "text";
ALTER TABLE "TreatmentPlanItem" DROP COLUMN "unitPrice";
ALTER TABLE "TreatmentPlanItem" DROP COLUMN "quantity";
ALTER TABLE "TreatmentPlanItem" DROP COLUMN "discountNote";

CREATE INDEX "TreatmentPlanLine_planItemId_idx" ON "TreatmentPlanLine"("planItemId");
CREATE INDEX "TreatmentPlanLine_feeItemId_idx" ON "TreatmentPlanLine"("feeItemId");

ALTER TABLE "TreatmentPlanLine" ADD CONSTRAINT "TreatmentPlanLine_planItemId_fkey" FOREIGN KEY ("planItemId") REFERENCES "TreatmentPlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TreatmentPlanLine" ADD CONSTRAINT "TreatmentPlanLine_feeItemId_fkey" FOREIGN KEY ("feeItemId") REFERENCES "FeeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
