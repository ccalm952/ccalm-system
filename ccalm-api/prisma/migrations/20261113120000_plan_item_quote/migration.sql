-- AlterTable
ALTER TABLE "TreatmentPlanItem" ADD COLUMN "unitPrice" DOUBLE PRECISION,
ADD COLUMN "quantity" INTEGER,
ADD COLUMN "discountNote" TEXT NOT NULL DEFAULT '';
