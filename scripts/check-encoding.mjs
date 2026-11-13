// 检查源码文件是不是合法 UTF-8：有 BOM、或是被按 GBK 转码过（出现 U+FFFD）就报错。
// 起因：用 PowerShell 的 Get-Content/Set-Content 改文件会把 UTF-8 中文读成 GBK 再写回，内容就坏了。
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const roots = ["ccalm-web/src", "ccalm-api/src", "ccalm-miniprogram"];
const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".vue", ".wxml", ".wxss", ".wxs"]);
const skip = new Set(["node_modules", "dist", "build", ".git", "miniprogram_npm"]);

const problems = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skip.has(entry.name)) walk(full);
      continue;
    }
    if (!exts.has(path.extname(entry.name))) continue;
    const buf = readFileSync(full);
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
      problems.push(`${full}: 含 UTF-8 BOM`);
      continue;
    }
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch {
      problems.push(`${full}: 不是合法 UTF-8`);
      continue;
    }
    if (text.includes("\uFFFD")) {
      problems.push(`${full}: 含替换字符 U+FFFD（多半是被按 GBK 转码过）`);
    }
  }
}

for (const root of roots) {
  try {
    walk(root);
  } catch {
    // 目录不存在就跳过
  }
}

if (problems.length) {
  console.error("编码检查失败：\n" + problems.join("\n"));
  process.exit(1);
}
console.log("编码检查通过");
