-- Resolve spec conflicts before merging duplicate products
WITH keepers AS (
    SELECT "name", MIN("id") AS keep_id
    FROM "WarehouseProduct"
    GROUP BY "name"
),
dupes AS (
    SELECT p."id" AS dup_id, k.keep_id
    FROM "WarehouseProduct" p
    INNER JOIN keepers k ON p."name" = k."name" AND p."id" <> k.keep_id
)
UPDATE "WarehouseItem" AS wi
SET "spec" = CASE
    WHEN wi."spec" = '' THEN wi."code"
    ELSE wi."spec" || ' (' || wi."code" || ')'
END
FROM dupes AS d
WHERE wi."productId" = d.dup_id
AND EXISTS (
    SELECT 1
    FROM "WarehouseItem" AS keeper_item
    WHERE keeper_item."productId" = d.keep_id
      AND keeper_item."spec" = wi."spec"
);

WITH keepers AS (
    SELECT "name", MIN("id") AS keep_id
    FROM "WarehouseProduct"
    GROUP BY "name"
),
dupes AS (
    SELECT p."id" AS dup_id, k.keep_id
    FROM "WarehouseProduct" p
    INNER JOIN keepers k ON p."name" = k."name" AND p."id" <> k.keep_id
)
UPDATE "WarehouseItem" AS wi
SET "productId" = d.keep_id
FROM dupes AS d
WHERE wi."productId" = d.dup_id;

WITH keepers AS (
    SELECT "name", MIN("id") AS keep_id
    FROM "WarehouseProduct"
    GROUP BY "name"
),
dupes AS (
    SELECT p."id" AS dup_id
    FROM "WarehouseProduct" p
    INNER JOIN keepers k ON p."name" = k."name" AND p."id" <> k.keep_id
)
DELETE FROM "WarehouseProduct" AS p
USING dupes AS d
WHERE p."id" = d.dup_id;

CREATE UNIQUE INDEX "WarehouseProduct_name_key" ON "WarehouseProduct"("name");
