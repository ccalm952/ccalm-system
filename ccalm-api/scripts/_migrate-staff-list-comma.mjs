/**
 * 配台人员串：顿号/半角逗号/+ 等 → 全角逗号「，」
 * 覆盖 MedicalRecord.nurse、ImplantVisit.staff
 *
 * 用法（在 ccalm-api 目录，DATABASE_URL 指向目标库）：
 *   node scripts/_migrate-staff-list-comma.mjs          # dry-run
 *   node scripts/_migrate-staff-list-comma.mjs --apply  # 写库
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

function formatStaffNames(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s
    .split(/[、,，+\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join("，");
}

const stats = {
  records: 0,
  recordsPatched: 0,
  implants: 0,
  implantsPatched: 0,
};

const records = await prisma.medicalRecord.findMany({
  select: { id: true, nurse: true },
});
stats.records = records.length;
for (const r of records) {
  const next = formatStaffNames(r.nurse);
  if (next === (r.nurse ?? "").trim()) continue;
  stats.recordsPatched += 1;
  console.log(`record#${r.id} nurse: ${JSON.stringify(r.nurse)} → ${JSON.stringify(next)}`);
  if (apply) {
    await prisma.medicalRecord.update({
      where: { id: r.id },
      data: { nurse: next },
    });
  }
}

const implants = await prisma.implantVisit.findMany({
  select: { id: true, staff: true },
});
stats.implants = implants.length;
for (const v of implants) {
  if (v.staff == null || !String(v.staff).trim()) continue;
  const next = formatStaffNames(v.staff);
  if (next === String(v.staff).trim()) continue;
  stats.implantsPatched += 1;
  console.log(`implant#${v.id} staff: ${JSON.stringify(v.staff)} → ${JSON.stringify(next)}`);
  if (apply) {
    await prisma.implantVisit.update({
      where: { id: v.id },
      data: { staff: next },
    });
  }
}

console.log(JSON.stringify({ apply, ...stats }, null, 2));
await prisma.$disconnect();
