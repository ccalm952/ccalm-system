-- 患者标签库：标签名称仍保存在 Patient.tags，Tag 提供颜色、缩写与启停用
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "abbreviation" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- 把现有患者身上的标签回填成标签库记录
INSERT INTO "Tag" ("name", "color", "abbreviation", "enabled", "sortOrder", "createdAt", "updatedAt")
SELECT
    x."name",
    p."palette"[((x."rn" - 1) % 10) + 1],
    '',
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (
    SELECT
        s."name",
        row_number() OVER (ORDER BY s."name") AS "rn"
    FROM (
        SELECT DISTINCT btrim(t) AS "name"
        FROM "Patient", unnest("tags") AS t
        WHERE btrim(t) <> ''
    ) AS s
) AS x
CROSS JOIN (
    SELECT ARRAY[
        '#e11d48', '#f97316', '#eab308', '#22c55e', '#14b8a6',
        '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#64748b'
    ]::text[] AS "palette"
) AS p
ON CONFLICT ("name") DO NOTHING;
