-- 种植就诊：就诊本身保存牙位快照，工作台只读就诊/预约数据
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "implantTeeth" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 1) 历史种植记录：完全没有任何就诊记录的「患者 + 日期」补一条种植就诊
WITH missing AS (
  SELECT iv."patientId",
         iv."visitDate",
         COALESCE(MAX(NULLIF(BTRIM(iv."staff"), '')), '') AS staff
  FROM "ImplantVisit" iv
  WHERE NOT EXISTS (
    SELECT 1 FROM "Appointment" a
    WHERE a."patientId" = iv."patientId"
      AND a."visitDate" = iv."visitDate"
  )
    AND NOT EXISTS (
      SELECT 1 FROM "PatientVisit" pv
      WHERE pv."patientId" = iv."patientId"
        AND pv."visitDate" = iv."visitDate"
    )
  GROUP BY iv."patientId", iv."visitDate"
)
INSERT INTO "PatientVisit"
  ("patientId", "visitDate", "startTime", "endTime", "kind", "status", "doctor", "remark", "createdAt", "updatedAt")
SELECT "patientId", "visitDate", '', '', 'return', 'booked', "staff", '种植就诊', NOW(), NOW()
FROM missing;

-- 2) 给没有预约的种植「患者 + 日期」补预约（复用当天已有就诊，否则用上一步新建的）
WITH missing AS (
  SELECT iv."patientId", iv."visitDate"
  FROM "ImplantVisit" iv
  WHERE NOT EXISTS (
    SELECT 1 FROM "Appointment" a
    WHERE a."patientId" = iv."patientId"
      AND a."visitDate" = iv."visitDate"
  )
  GROUP BY iv."patientId", iv."visitDate"
),
target AS (
  SELECT m."patientId",
         m."visitDate",
         (
           SELECT pv."id" FROM "PatientVisit" pv
           WHERE pv."patientId" = m."patientId"
             AND pv."visitDate" = m."visitDate"
           ORDER BY pv."id" DESC
           LIMIT 1
         ) AS "visitId"
  FROM missing m
)
INSERT INTO "Appointment"
  ("patientId", "visitId", "visitDate", "startTime", "endTime", "kind", "status",
   "doctor", "remark", "source", "implantTeeth", "updatedAt")
SELECT t."patientId",
       t."visitId",
       t."visitDate",
       '',
       '',
       'return',
       'booked',
       COALESCE(pv."doctor", ''),
       '种植就诊',
       'implant',
       ARRAY(
         SELECT DISTINCT BTRIM(it."toothNo")
         FROM "ImplantVisit" iv
         JOIN "ImplantTooth" it ON it."visitId" = iv."id"
         WHERE iv."patientId" = t."patientId"
           AND iv."visitDate" = t."visitDate"
           AND it."toothNo" IS NOT NULL
           AND BTRIM(it."toothNo") <> ''
         ORDER BY 1
       ),
       NOW()
FROM target t
JOIN "PatientVisit" pv ON pv."id" = t."visitId"
WHERE t."visitId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Appointment" a WHERE a."visitId" = t."visitId"
  );
