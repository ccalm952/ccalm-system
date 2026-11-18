UPDATE "ChargePayment" p
SET "doctor" = v."doctor"
FROM "PatientVisit" v
WHERE p."visitId" = v."id" AND p."doctor" = '';
