-- ImplantPatient becomes the shared Patient table
ALTER TABLE "ImplantPatient" RENAME TO "Patient";
ALTER TABLE "Patient" RENAME CONSTRAINT "ImplantPatient_pkey" TO "Patient_pkey";
ALTER SEQUENCE "ImplantPatient_id_seq" RENAME TO "Patient_id_seq";
ALTER INDEX "ImplantPatient_name_idx" RENAME TO "Patient_name_idx";
ALTER INDEX "ImplantPatient_phone_idx" RENAME TO "Patient_phone_idx";

ALTER TABLE "Patient" ALTER COLUMN "phone" SET DEFAULT '';
ALTER TABLE "Patient" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Patient" ADD COLUMN "remark" TEXT NOT NULL DEFAULT '';

CREATE INDEX "Patient_chartNo_idx" ON "Patient"("chartNo");

ALTER TABLE "ImplantPending" ADD COLUMN "patientId" INTEGER;
ALTER TABLE "OrthodonticsPatient" ADD COLUMN "patientId" INTEGER;

-- Same person = same name plus same non-empty chart number or phone
DO $$
DECLARE
    r RECORD;
    pid INTEGER;
BEGIN
    FOR r IN
        SELECT 'pending' AS src, "id", "name", "phone", "chartNo", "createdAt"
        FROM "ImplantPending"
        UNION ALL
        SELECT 'ortho' AS src, "id", "name", "phone", "chartNo", "createdAt"
        FROM "OrthodonticsPatient"
        ORDER BY "createdAt", "src", "id"
    LOOP
        SELECT p."id" INTO pid
        FROM "Patient" p
        WHERE p."name" = r."name"
          AND (
            (r."chartNo" <> '' AND p."chartNo" = r."chartNo")
            OR (r."phone" <> '' AND p."phone" = r."phone")
          )
        ORDER BY p."id"
        LIMIT 1;

        IF pid IS NULL THEN
            INSERT INTO "Patient" ("name", "phone", "chartNo", "createdAt", "updatedAt")
            VALUES (r."name", r."phone", r."chartNo", r."createdAt", CURRENT_TIMESTAMP)
            RETURNING "id" INTO pid;
        ELSE
            UPDATE "Patient"
            SET "chartNo" = CASE WHEN "chartNo" = '' THEN r."chartNo" ELSE "chartNo" END,
                "phone" = CASE WHEN "phone" = '' THEN r."phone" ELSE "phone" END
            WHERE "id" = pid;
        END IF;

        IF r."src" = 'pending' THEN
            UPDATE "ImplantPending" SET "patientId" = pid WHERE "id" = r."id";
        ELSE
            UPDATE "OrthodonticsPatient" SET "patientId" = pid WHERE "id" = r."id";
        END IF;
    END LOOP;
END $$;

ALTER TABLE "ImplantPending" ALTER COLUMN "patientId" SET NOT NULL;
ALTER TABLE "OrthodonticsPatient" ALTER COLUMN "patientId" SET NOT NULL;

DROP INDEX "ImplantPending_name_idx";
DROP INDEX "ImplantPending_phone_idx";
ALTER TABLE "ImplantPending" DROP COLUMN "name";
ALTER TABLE "ImplantPending" DROP COLUMN "phone";
ALTER TABLE "ImplantPending" DROP COLUMN "chartNo";

DROP INDEX "OrthodonticsPatient_name_idx";
ALTER TABLE "OrthodonticsPatient" DROP COLUMN "name";
ALTER TABLE "OrthodonticsPatient" DROP COLUMN "phone";
ALTER TABLE "OrthodonticsPatient" DROP COLUMN "chartNo";

CREATE INDEX "ImplantPending_patientId_idx" ON "ImplantPending"("patientId");
CREATE INDEX "OrthodonticsPatient_patientId_idx" ON "OrthodonticsPatient"("patientId");

ALTER TABLE "ImplantPending" ADD CONSTRAINT "ImplantPending_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrthodonticsPatient" ADD CONSTRAINT "OrthodonticsPatient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
