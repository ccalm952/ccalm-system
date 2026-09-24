-- DropTable
DROP TABLE IF EXISTS "Memo";

-- CreateEnum
CREATE TYPE "WarehouseTxnType" AS ENUM ('in', 'out', 'adjust');

-- CreateEnum
CREATE TYPE "WarehouseTxnBizType" AS ENUM ('purchase', 'use', 'return_in', 'return_out', 'adjust_in', 'adjust_out');

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

-- CreateTable
CREATE TABLE "WarehouseItem" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "spec" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '个',
    "currentQty" INTEGER NOT NULL DEFAULT 0,
    "lastPurchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseTxn" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "type" "WarehouseTxnType" NOT NULL,
    "bizType" "WarehouseTxnBizType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "occurDate" TEXT NOT NULL,
    "operatorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarehouseTxn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WarehouseProduct_name_idx" ON "WarehouseProduct"("name");

-- CreateIndex
CREATE INDEX "WarehouseProduct_category_idx" ON "WarehouseProduct"("category");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseProduct_name_brand_key" ON "WarehouseProduct"("name", "brand");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseItem_code_key" ON "WarehouseItem"("code");

-- CreateIndex
CREATE INDEX "WarehouseItem_productId_idx" ON "WarehouseItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseItem_productId_spec_key" ON "WarehouseItem"("productId", "spec");

-- CreateIndex
CREATE INDEX "WarehouseTxn_itemId_occurDate_idx" ON "WarehouseTxn"("itemId", "occurDate");

-- CreateIndex
CREATE INDEX "WarehouseTxn_type_occurDate_idx" ON "WarehouseTxn"("type", "occurDate");

-- AddForeignKey
ALTER TABLE "WarehouseItem" ADD CONSTRAINT "WarehouseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "WarehouseProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseTxn" ADD CONSTRAINT "WarehouseTxn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "WarehouseItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseTxn" ADD CONSTRAINT "WarehouseTxn_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
