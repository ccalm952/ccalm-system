-- 已写病历的就诊视为治疗完成
UPDATE "PatientVisit" v
SET "status" = 'completed'
WHERE v."status" IN ('booked', 'arrived')
  AND EXISTS (SELECT 1 FROM "MedicalRecord" r WHERE r."visitId" = v."id");

-- 就诊医生以最近更新的、填了医生的病历为准
UPDATE "PatientVisit" v
SET "doctor" = r."doctor"
FROM (
  SELECT DISTINCT ON ("visitId") "visitId", "doctor"
  FROM "MedicalRecord"
  WHERE "visitId" IS NOT NULL AND "doctor" <> ''
  ORDER BY "visitId", "updatedAt" DESC
) r
WHERE v."id" = r."visitId";
