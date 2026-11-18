-- 种植就诊默认不带医生：医生在写病历时才写入就诊/预约。
-- 20261116235500 的历史回填把种植记录的「人员」直接写进了就诊医生，
-- 导致旧记录一直显示「医生：卢+许+陈」这类值；这里清空尚未写病历的那部分。
-- 已完成且已有病历的就诊保留医生（那是写病历时同步进来的，属于正常数据）。

-- 1) 预约同步清空，避免工作台仍显示旧医生
UPDATE "Appointment" a
SET "doctor" = '',
    "updatedAt" = NOW()
FROM "PatientVisit" v
WHERE a."visitId" = v."id"
  AND a."source" = 'implant'
  AND v."remark" = '种植就诊'
  AND v."status" = 'booked'
  AND v."doctor" <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "MedicalRecord" m WHERE m."visitId" = v."id"
  );

-- 2) 就诊记录清空医生
UPDATE "PatientVisit" v
SET "doctor" = '',
    "updatedAt" = NOW()
WHERE v."remark" = '种植就诊'
  AND v."status" = 'booked'
  AND v."doctor" <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "MedicalRecord" m WHERE m."visitId" = v."id"
  );
