-- 有病历（或已完成）却无预约的就诊，补一条预约（对齐「就诊一对一预约」）
INSERT INTO "Appointment" (
  "patientId",
  "visitId",
  "visitDate",
  "startTime",
  "endTime",
  "kind",
  "status",
  "doctor",
  "remark",
  "items",
  "source",
  "createdById",
  "missedReason",
  "completedAt",
  "isPending",
  "pendingReason",
  "createdAt",
  "updatedAt"
)
SELECT
  v."patientId",
  v."id",
  v."visitDate",
  v."startTime",
  v."endTime",
  v."kind",
  CASE
    WHEN v."status" = 'completed' THEN 'completed'
    WHEN v."status" IN ('missed', 'cancelled') THEN 'missed'
    ELSE 'booked'
  END,
  v."doctor",
  CASE
    WHEN v."remark" IN ('从e看牙导入', 'imported from e看牙', '由病历创建') THEN v."remark"
    ELSE '补建预约'
  END,
  v."items",
  CASE
    WHEN v."source" IN ('record', 'implant', 'manual', 'network', 'system') THEN v."source"
    ELSE 'system'
  END,
  v."createdById",
  '',
  v."completedAt",
  v."isPending",
  v."pendingReason",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PatientVisit" v
WHERE NOT EXISTS (
  SELECT 1 FROM "Appointment" a WHERE a."visitId" = v."id"
)
AND (
  v."status" = 'completed'
  OR EXISTS (
    SELECT 1 FROM "MedicalRecord" m WHERE m."visitId" = v."id"
  )
);
