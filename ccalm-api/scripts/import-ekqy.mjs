/**
 * 把 scripts/ekqy/.raw.json 提交到线上/本地 API（不再直连数据库）。
 *
 * 环境变量：
 *   EKQY_API_BASE  默认 https://www.ccalm.xyz/api
 *   EKQY_TOKEN     Bearer JWT（需具备 patient.import_ekqy）
 *
 * 用法：
 *   node scripts/import-ekqy.mjs
 *   node scripts/import-ekqy.mjs --dry-run
 *   node scripts/import-ekqy.mjs --chart 12345
 */
import fs from "node:fs/promises";

const ROOT = "C:/Users/ccalm/Desktop/ccalm-system";
const RAW_FILE = `${ROOT}/scripts/ekqy/.raw.json`;
const TOKEN_FILE = `${ROOT}/scripts/ekqy/.token.txt`;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const chartIdx = args.indexOf("--chart");
const chartNo =
  chartIdx >= 0 ? String(args[chartIdx + 1] ?? "").trim() : "";

async function readToken() {
  if (process.env.EKQY_TOKEN?.trim()) return process.env.EKQY_TOKEN.trim();
  try {
    const text = await fs.readFile(TOKEN_FILE, "utf8");
    const token = text.trim();
    if (token) return token;
  } catch {}
  throw new Error(
    "缺少 EKQY_TOKEN：请设置环境变量，或写入 scripts/ekqy/.token.txt（登录后 localStorage auth:token）",
  );
}

const apiBase = (
  process.env.EKQY_API_BASE ||
  "https://www.ccalm.xyz/api"
).replace(/\/$/, "");
const token = await readToken();
const raw = JSON.parse(await fs.readFile(RAW_FILE, "utf8"));
if (!raw.patientId) throw new Error("raw data has no patientId");

const body = {
  ...raw,
  ...(chartNo ? { chartNo } : {}),
  dryRun,
};

const res = await fetch(`${apiBase}/patients/ekqy-import`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(body),
});
const text = await res.text();
let data = null;
try {
  data = text ? JSON.parse(text) : null;
} catch {
  data = text;
}
if (!res.ok) {
  const msg =
    data && typeof data === "object" && "message" in data
      ? Array.isArray(data.message)
        ? data.message.join("; ")
        : String(data.message)
      : text || res.statusText;
  throw new Error(`导入失败 ${res.status}: ${msg}`);
}
console.log(JSON.stringify(data, null, 2));
