-- ScheduleEntry 仅用于员工手动登记的休息，移除已无意义的 isManual 字段
ALTER TABLE "ScheduleEntry" DROP COLUMN "isManual";
