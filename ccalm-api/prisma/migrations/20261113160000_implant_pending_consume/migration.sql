-- 已种的牙位从待种植里去掉，规则同 src/modules/implant/pending-teeth.ts：
-- 只处理纯 FDI 牙位列表；只算拔牙日期（没填则登记日期）当天及之后的种植
CREATE TEMP TABLE pending_rest AS
WITH parsed AS (
  SELECT p.id, p."patientId",
    coalesce(nullif(p."extractionDate", ''), to_char(p."createdAt", 'YYYY-MM-DD')) AS since,
    regexp_split_to_array(trim(p.teeth), '[\s、，,/]+') AS teeth
  FROM "ImplantPending" p
  WHERE p.teeth ~ '^\s*([1-4][1-8]|[5-8][1-5])([\s、，,/]+([1-4][1-8]|[5-8][1-5]))*\s*$'
)
SELECT pr.id, pr.teeth,
  array(
    SELECT u.t FROM unnest(pr.teeth) WITH ORDINALITY AS u(t, i)
    WHERE u.t NOT IN (
      SELECT tok FROM "ImplantVisit" v
      JOIN "ImplantTooth" it ON it."visitId" = v.id
      CROSS JOIN LATERAL regexp_split_to_table(coalesce(it."toothNo", ''), '[\s、，,/]+') AS tok
      WHERE v."patientId" = pr."patientId" AND v."visitDate" >= pr.since
    )
    ORDER BY u.i
  ) AS rest
FROM parsed pr;

DELETE FROM "ImplantPending"
WHERE id IN (SELECT id FROM pending_rest WHERE cardinality(rest) = 0);

UPDATE "ImplantPending" p
SET teeth = array_to_string(r.rest, ' '), "updatedAt" = CURRENT_TIMESTAMP
FROM pending_rest r
WHERE p.id = r.id AND cardinality(r.rest) BETWEEN 1 AND cardinality(r.teeth) - 1;

DROP TABLE pending_rest;
