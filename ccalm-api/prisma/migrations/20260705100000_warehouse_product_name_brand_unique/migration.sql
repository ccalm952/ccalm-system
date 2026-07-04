DROP INDEX IF EXISTS "WarehouseProduct_name_key";

CREATE UNIQUE INDEX "WarehouseProduct_name_brand_key" ON "WarehouseProduct"("name", "brand");
