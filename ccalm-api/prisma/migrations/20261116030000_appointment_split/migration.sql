CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "visitId" INTEGER,
    "visitDate" TEXT NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '',
    "endTime" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'return',
    "status" TEXT NOT NULL DEFAULT 'booked',
    "doctor" TEXT NOT NULL DEFAULT '',
    "remark" TEXT NOT NULL DEFAULT '',
    "items" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'booking',
    "createdById" TEXT,
    "missedReason" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "isPending" BOOLEAN NOT NULL DEFAULT false,
    "pendingReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Appointment_visitId_key" ON "Appointment"("visitId");
CREATE INDEX "Appointment_patientId_visitDate_idx" ON "Appointment"("patientId", "visitDate");
CREATE INDEX "Appointment_visitDate_idx" ON "Appointment"("visitDate");
CREATE INDEX "Appointment_visitDate_status_idx" ON "Appointment"("visitDate", "status");
CREATE INDEX "Appointment_visitDate_doctor_idx" ON "Appointment"("visitDate", "doctor");
CREATE INDEX "Appointment_isPending_visitDate_idx" ON "Appointment"("isPending", "visitDate");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "PatientVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Appointment" (
    "patientId", "visitId", "visitDate", "startTime", "endTime", "kind", "status",
    "doctor", "remark", "items", "source", "createdById", "missedReason",
    "completedAt", "isPending", "pendingReason", "createdAt", "updatedAt"
)
SELECT
    v."patientId",
    CASE WHEN v."status" = 'completed' THEN v."id" ELSE NULL END,
    v."visitDate", v."startTime", v."endTime", v."kind",
    CASE
        WHEN v."status" = 'completed' THEN 'completed'
        WHEN v."status" IN ('missed', 'cancelled') THEN 'missed'
        ELSE 'booked'
    END,
    v."doctor", v."remark", v."items",
    CASE WHEN v."isPending" AND v."status" = 'booked' THEN 'pending' ELSE 'booking' END,
    v."createdById",
    CASE WHEN v."status" = 'cancelled' THEN COALESCE(NULLIF(v."cancelReason", ''), '已取消（迁移）') ELSE v."cancelReason" END,
    v."completedAt",
    v."isPending", v."pendingReason",
    v."createdAt", v."updatedAt"
FROM "PatientVisit" v;

DELETE FROM "PatientVisit" v
WHERE v."status" <> 'completed'
  AND NOT EXISTS (SELECT 1 FROM "MedicalRecord" m WHERE m."visitId" = v."id")
  AND NOT EXISTS (SELECT 1 FROM "ChargeOrder" c WHERE c."visitId" = v."id");