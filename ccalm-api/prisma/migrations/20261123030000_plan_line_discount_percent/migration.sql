-- 治疗计划明细：优惠说明文案改为折扣率（%）
ALTER TABLE "TreatmentPlanLine" ADD COLUMN "discountPercent" DOUBLE PRECISION;
ALTER TABLE "TreatmentPlanLine" DROP COLUMN "discountNote";
