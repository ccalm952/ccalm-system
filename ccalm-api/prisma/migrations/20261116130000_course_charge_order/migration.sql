-- 疗程收费单：一个初诊病历（疗程）一张收费单，分次收款
ALTER TABLE "ChargeOrder" ADD COLUMN "recordId" INTEGER;

CREATE UNIQUE INDEX "ChargeOrder_recordId_key" ON "ChargeOrder"("recordId");

ALTER TABLE "ChargeOrder" ADD CONSTRAINT "ChargeOrder_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
