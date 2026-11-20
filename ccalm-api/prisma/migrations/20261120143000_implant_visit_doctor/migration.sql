-- 种植记录单独存医生；「人员」继续表示配台，不再当地医生。
ALTER TABLE "ImplantVisit"
  ADD COLUMN IF NOT EXISTS "doctor" TEXT;
