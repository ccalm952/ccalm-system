-- CreateTable
CREATE TABLE "ImplantPatient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "chartNo" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT '',
    "birthday" TEXT,
    "age" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImplantPatient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImplantVisit" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "visitDate" TEXT NOT NULL,
    "remark" TEXT,
    "staff" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImplantVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImplantTooth" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER NOT NULL,
    "toothNo" TEXT,
    "implantBrand" TEXT,
    "implantModel" TEXT,
    "toothRemark" TEXT,

    CONSTRAINT "ImplantTooth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImplantInventory" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "supplement" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ImplantInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImplantPatient_name_idx" ON "ImplantPatient"("name");

-- CreateIndex
CREATE INDEX "ImplantPatient_phone_idx" ON "ImplantPatient"("phone");

-- CreateIndex
CREATE INDEX "ImplantVisit_patientId_visitDate_idx" ON "ImplantVisit"("patientId", "visitDate");

-- CreateIndex
CREATE INDEX "ImplantTooth_visitId_idx" ON "ImplantTooth"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "ImplantInventory_brand_model_key" ON "ImplantInventory"("brand", "model");

-- AddForeignKey
ALTER TABLE "ImplantVisit" ADD CONSTRAINT "ImplantVisit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "ImplantPatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImplantTooth" ADD CONSTRAINT "ImplantTooth_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "ImplantVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
