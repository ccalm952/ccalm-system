-- 收款关联就诊
ALTER TABLE "ChargePayment" ADD COLUMN "visitId" INTEGER;

CREATE INDEX "ChargePayment_visitId_idx" ON "ChargePayment"("visitId");

ALTER TABLE "ChargePayment" ADD CONSTRAINT "ChargePayment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "PatientVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
