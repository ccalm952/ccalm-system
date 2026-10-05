-- AlterTable
ALTER TABLE "User" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill: keep current displayName / username order
WITH ordered AS (
  SELECT
    "id",
    (ROW_NUMBER() OVER (ORDER BY "displayName" ASC, "username" ASC) - 1)::INTEGER AS "ord"
  FROM "User"
)
UPDATE "User" AS u
SET "sortOrder" = ordered."ord"
FROM ordered
WHERE u."id" = ordered."id";
