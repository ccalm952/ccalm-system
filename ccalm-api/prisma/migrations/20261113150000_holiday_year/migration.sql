CREATE TABLE "HolidayYear" (
    "year" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HolidayYear_pkey" PRIMARY KEY ("year")
);
