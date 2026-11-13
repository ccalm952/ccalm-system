-- CreateTable
CREATE TABLE "FeeCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeItem" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FeeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeeCategory_name_key" ON "FeeCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FeeItem_categoryId_name_key" ON "FeeItem"("categoryId", "name");

-- AddForeignKey
ALTER TABLE "FeeItem" ADD CONSTRAINT "FeeItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FeeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ChargeItem" ADD COLUMN "feeItemId" INTEGER;

-- AddForeignKey
ALTER TABLE "ChargeItem" ADD CONSTRAINT "ChargeItem_feeItemId_fkey" FOREIGN KEY ("feeItemId") REFERENCES "FeeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed categories
INSERT INTO "FeeCategory" ("name", "sort") VALUES
    ('洁牙费', 1),
    ('治疗费', 2),
    ('拔牙费', 3),
    ('修复费', 4),
    ('种植费', 5),
    ('加工费', 6),
    ('麻醉费', 7),
    ('西药费', 8),
    ('正畸费', 9),
    ('放射费', 10);
