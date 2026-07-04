-- CreateTable
CREATE TABLE "WarehouseProduct" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '其他',
    "brand" TEXT NOT NULL DEFAULT '',
    "manufacturer" TEXT NOT NULL DEFAULT '',
    "supplierName" TEXT NOT NULL DEFAULT '',
    "defaultUnit" TEXT NOT NULL DEFAULT '个',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WarehouseProduct_name_idx" ON "WarehouseProduct"("name");

-- CreateIndex
CREATE INDEX "WarehouseProduct_category_idx" ON "WarehouseProduct"("category");

-- AlterTable
ALTER TABLE "WarehouseItem" ADD COLUMN "productId" INTEGER;

-- Migrate existing items into products grouped by name
INSERT INTO "WarehouseProduct" (
    "name",
    "category",
    "brand",
    "manufacturer",
    "supplierName",
    "defaultUnit",
    "enabled",
    "createdAt",
    "updatedAt"
)
SELECT DISTINCT ON ("name")
    "name",
    "category",
    "brand",
    "manufacturer",
    "supplierName",
    "unit",
    "enabled",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "WarehouseItem"
ORDER BY "name", "id";

UPDATE "WarehouseItem" AS wi
SET "productId" = wp."id"
FROM "WarehouseProduct" AS wp
WHERE wi."name" = wp."name";

-- Resolve duplicate (productId, spec) before unique constraint
UPDATE "WarehouseItem" AS wi
SET "spec" = CASE
    WHEN wi."spec" = '' THEN wi."code"
    ELSE wi."spec" || ' (' || wi."code" || ')'
END
WHERE wi."id" IN (
    SELECT "id"
    FROM (
        SELECT
            "id",
            ROW_NUMBER() OVER (
                PARTITION BY "productId", "spec"
                ORDER BY "id"
            ) AS rn
        FROM "WarehouseItem"
    ) AS ranked
    WHERE ranked.rn > 1
);

ALTER TABLE "WarehouseItem" ALTER COLUMN "productId" SET NOT NULL;

-- DropIndex
DROP INDEX "WarehouseItem_name_idx";

-- DropIndex
DROP INDEX "WarehouseItem_category_idx";

-- AlterTable
ALTER TABLE "WarehouseItem" DROP COLUMN "name",
DROP COLUMN "category",
DROP COLUMN "brand",
DROP COLUMN "manufacturer",
DROP COLUMN "supplierName";

-- CreateIndex
CREATE INDEX "WarehouseItem_productId_idx" ON "WarehouseItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseItem_productId_spec_key" ON "WarehouseItem"("productId", "spec");

-- AddForeignKey
ALTER TABLE "WarehouseItem" ADD CONSTRAINT "WarehouseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "WarehouseProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
