/**
 * 旧病历数据迁移：
 * - 正文/处置 text / 计划备注：半角 , → 全角 ，
 * - 牙位号串：空格/顿号/全角逗号 → 半角 ,
 * - 种植自动病历处置行：空格分段 → 全角逗号
 *
 * 用法（在 ccalm-api 目录，DATABASE_URL 指向目标库）：
 *   node scripts/_migrate-emr-commas.mjs          # dry-run，只打印统计
 *   node scripts/_migrate-emr-commas.mjs --apply  # 写库
 *
 * 开发库已迁过。上线时务必对生产库再跑一次 --apply（应用代码已只认半角逗号牙位串）。
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const root = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(root, "..", ".env") });

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const IMPLANT_EMR_REMARK = "从种植记录自动生成";
const TEXT_FIELDS = [
  "chiefComplaint",
  "presentIllness",
  "pastHistory",
  "auxiliaryExam",
  "advice",
  "remark",
];

function toFullWidthComma(s) {
  return s.replace(/,/g, "，");
}

function normalizeTeethFdiString(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const parts = s.split(/[\s、，,/]+/).filter(Boolean);
  if (!parts.length) return "";
  if (!parts.every((p) => /^\d{2}$/.test(p))) return s;
  return [...new Set(parts)].sort((a, b) => Number(a) - Number(b)).join(",");
}

/** 种植自动处置行：`14 Osstem 3508` → `14，Osstem，3508` */
function migrateImplantTreatmentText(text) {
  return String(text ?? "")
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\d{2})\s+(.+)$/);
      if (!m) return toFullWidthComma(line);
      const rest = m[2]
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => toFullWidthComma(p));
      return [m[1], ...rest].join("，");
    })
    .join("\n");
}

function migrateToothEntries(raw, { implantAuto = false } = {}) {
  if (!Array.isArray(raw)) return { next: raw, changed: false };
  let changed = false;
  const next = raw.map((e) => {
    if (!e || typeof e !== "object") return e;
    const teeth = normalizeTeethFdiString(e.teeth ?? "");
    let text = typeof e.text === "string" ? e.text : "";
    text = implantAuto
      ? migrateImplantTreatmentText(text)
      : toFullWidthComma(text);
    if (teeth !== (e.teeth ?? "").trim() || text !== (e.text ?? "")) {
      changed = true;
    }
    return { ...e, teeth, text };
  });
  return { next, changed };
}

const stats = {
  records: 0,
  recordsPatched: 0,
  planItems: 0,
  planItemsPatched: 0,
  chargeItems: 0,
  chargeItemsPatched: 0,
  pendings: 0,
  pendingsPatched: 0,
};

const records = await prisma.medicalRecord.findMany();
stats.records = records.length;
for (const r of records) {
  const implantAuto = r.remark === IMPLANT_EMR_REMARK;
  const patch = {};
  for (const f of TEXT_FIELDS) {
    const cur = r[f] ?? "";
    const next = toFullWidthComma(cur);
    if (next !== cur) patch[f] = next;
  }
  for (const f of ["oralExam", "diagnosis", "treatment"]) {
    const { next, changed } = migrateToothEntries(r[f], {
      implantAuto: implantAuto && f === "treatment",
    });
    if (changed) patch[f] = next;
  }
  if (!Object.keys(patch).length) continue;
  stats.recordsPatched += 1;
  if (apply) {
    await prisma.medicalRecord.update({ where: { id: r.id }, data: patch });
  }
}

const planItems = await prisma.treatmentPlanItem.findMany();
stats.planItems = planItems.length;
for (const row of planItems) {
  const teeth = normalizeTeethFdiString(row.teeth);
  const text = toFullWidthComma(row.text ?? "");
  const discountNote = toFullWidthComma(row.discountNote ?? "");
  if (
    teeth === row.teeth &&
    text === row.text &&
    discountNote === row.discountNote
  ) {
    continue;
  }
  stats.planItemsPatched += 1;
  if (apply) {
    await prisma.treatmentPlanItem.update({
      where: { id: row.id },
      data: { teeth, text, discountNote },
    });
  }
}

const chargeItems = await prisma.chargeItem.findMany({
  select: { id: true, teeth: true },
});
stats.chargeItems = chargeItems.length;
for (const row of chargeItems) {
  const teeth = normalizeTeethFdiString(row.teeth);
  if (teeth === row.teeth) continue;
  stats.chargeItemsPatched += 1;
  if (apply) {
    await prisma.chargeItem.update({
      where: { id: row.id },
      data: { teeth },
    });
  }
}

const pendings = await prisma.implantPending.findMany({
  select: { id: true, teeth: true },
});
stats.pendings = pendings.length;
for (const row of pendings) {
  const teeth = normalizeTeethFdiString(row.teeth);
  if (teeth === row.teeth) continue;
  stats.pendingsPatched += 1;
  if (apply) {
    await prisma.implantPending.update({
      where: { id: row.id },
      data: { teeth },
    });
  }
}

console.log(
  JSON.stringify(
    {
      mode: apply ? "apply" : "dry-run",
      ...stats,
    },
    null,
    2,
  ),
);
if (!apply) {
  console.log("未写库。确认后加 --apply 执行。");
}

await prisma.$disconnect();
