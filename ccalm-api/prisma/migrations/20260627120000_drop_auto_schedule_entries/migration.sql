-- 排班改为打卡实时推算后，仅保留员工在考勤页登记的休息（isManual = true）
DELETE FROM "ScheduleEntry" WHERE "isManual" = false;
