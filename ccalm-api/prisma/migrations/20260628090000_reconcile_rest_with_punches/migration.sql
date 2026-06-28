-- 清理与打卡冲突的手动休息登记：有打卡的半天取消对应休息，全天冲突则删行或降为半天
WITH punch_flags AS (
  SELECT
    "userId",
    "punchDate" AS date,
    BOOL_OR("type" IN ('morning_in', 'morning_out')) AS has_morning,
    BOOL_OR("type" IN ('afternoon_in', 'afternoon_out')) AS has_afternoon
  FROM "AttendanceRecord"
  GROUP BY "userId", "punchDate"
),
to_delete AS (
  SELECT se."userId", se."date"
  FROM "ScheduleEntry" se
  INNER JOIN punch_flags pf
    ON se."userId" = pf."userId" AND se."date" = pf.date
  WHERE se."isManual" = true
    AND (
      (se."shiftType" = 'full_rest' AND pf.has_morning AND pf.has_afternoon)
      OR (se."shiftType" = 'morning_rest' AND pf.has_morning)
      OR (se."shiftType" = 'afternoon_rest' AND pf.has_afternoon)
    )
),
to_update AS (
  SELECT
    se."userId",
    se."date",
    CASE
      WHEN se."shiftType" = 'full_rest' AND pf.has_morning AND NOT pf.has_afternoon
        THEN 'afternoon_rest'::"ScheduleShiftType"
      WHEN se."shiftType" = 'full_rest' AND pf.has_afternoon AND NOT pf.has_morning
        THEN 'morning_rest'::"ScheduleShiftType"
    END AS new_shift
  FROM "ScheduleEntry" se
  INNER JOIN punch_flags pf
    ON se."userId" = pf."userId" AND se."date" = pf.date
  WHERE se."isManual" = true
    AND se."shiftType" = 'full_rest'
    AND (
      (pf.has_morning AND NOT pf.has_afternoon)
      OR (pf.has_afternoon AND NOT pf.has_morning)
    )
)
DELETE FROM "ScheduleEntry" se
USING to_delete td
WHERE se."userId" = td."userId" AND se."date" = td."date";

UPDATE "ScheduleEntry" se
SET
  "shiftType" = tu.new_shift,
  "updatedAt" = NOW()
FROM to_update tu
WHERE se."userId" = tu."userId"
  AND se."date" = tu."date"
  AND tu.new_shift IS NOT NULL;
