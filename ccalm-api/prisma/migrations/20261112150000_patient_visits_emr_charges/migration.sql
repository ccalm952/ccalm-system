-- CreateTable
CREATE TABLE "PatientVisit" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "visitDate" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '',
    "endTime" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'return',
    "status" TEXT NOT NULL DEFAULT 'arrived',
    "doctor" TEXT NOT NULL DEFAULT '',
    "remark" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "visitId" INTEGER,
    "type" TEXT NOT NULL,
    "visitDate" TEXT NOT NULL,
    "visitTime" TEXT NOT NULL DEFAULT '',
    "doctor" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "assistant" TEXT NOT NULL DEFAULT '',
    "nurse" TEXT NOT NULL DEFAULT '',
    "chiefComplaint" TEXT NOT NULL DEFAULT '',
    "presentIllness" TEXT NOT NULL DEFAULT '',
    "pastHistory" TEXT NOT NULL DEFAULT '',
    "oralExam" JSONB NOT NULL DEFAULT '[]',
    "auxiliaryExam" TEXT NOT NULL DEFAULT '',
    "diagnosis" JSONB NOT NULL DEFAULT '[]',
    "treatmentPlan" JSONB NOT NULL DEFAULT '[]',
    "treatment" JSONB NOT NULL DEFAULT '[]',
    "advice" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remark" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargeOrder" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "visitId" INTEGER,
    "chargeDate" TEXT NOT NULL,
    "doctor" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'normal',
    "receivable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remark" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargeItem" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "teeth" TEXT NOT NULL DEFAULT '',
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ChargeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargePayment" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT '',
    "paidAt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChargePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientVisit_patientId_visitDate_idx" ON "PatientVisit"("patientId", "visitDate");

-- CreateIndex
CREATE INDEX "PatientVisit_visitDate_idx" ON "PatientVisit"("visitDate");

-- CreateIndex
CREATE INDEX "MedicalRecord_patientId_visitDate_idx" ON "MedicalRecord"("patientId", "visitDate");

-- CreateIndex
CREATE INDEX "MedicalRecord_visitId_idx" ON "MedicalRecord"("visitId");

-- CreateIndex
CREATE INDEX "ChargeOrder_patientId_chargeDate_idx" ON "ChargeOrder"("patientId", "chargeDate");

-- CreateIndex
CREATE INDEX "ChargeOrder_visitId_idx" ON "ChargeOrder"("visitId");

-- CreateIndex
CREATE INDEX "ChargeItem_orderId_idx" ON "ChargeItem"("orderId");

-- CreateIndex
CREATE INDEX "ChargePayment_orderId_idx" ON "ChargePayment"("orderId");

-- AddForeignKey
ALTER TABLE "PatientVisit" ADD CONSTRAINT "PatientVisit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "PatientVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeOrder" ADD CONSTRAINT "ChargeOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeOrder" ADD CONSTRAINT "ChargeOrder_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "PatientVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ChargeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargePayment" ADD CONSTRAINT "ChargePayment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ChargeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
