ALTER TABLE "ChargeOrder" ADD COLUMN "isCourse" BOOLEAN NOT NULL DEFAULT false;
UPDATE "ChargeOrder" o
SET "isCourse" = true,
    "visitId" = COALESCE(o."visitId", r."visitId")
FROM "MedicalRecord" r
WHERE o."recordId" = r."id";
ALTER TABLE "ChargeOrder" DROP CONSTRAINT "ChargeOrder_recordId_fkey";
DROP INDEX "ChargeOrder_recordId_key";
ALTER TABLE "ChargeOrder" DROP COLUMN "recordId";
