-- 导入/回填曾把 endTime 写成与 startTime 相同，看板 assignLanes 会丢掉零时长卡片
UPDATE "PatientVisit"
SET "endTime" = to_char(
  (date '2000-01-01' + "startTime"::time + interval '30 minutes')::time,
  'HH24:MI'
)
WHERE "startTime" ~ '^\d{2}:\d{2}$'
  AND ("endTime" = '' OR "endTime" = "startTime");

UPDATE "Appointment"
SET "endTime" = to_char(
  (date '2000-01-01' + "startTime"::time + interval '30 minutes')::time,
  'HH24:MI'
)
WHERE "startTime" ~ '^\d{2}:\d{2}$'
  AND ("endTime" = '' OR "endTime" = "startTime");
