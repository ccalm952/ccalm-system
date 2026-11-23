/**
 * 环境配置。
 * 腾讯位置服务 Key 放在未提交的 config/local.js 中，避免把密钥带进仓库。
 * 注意：小程序 require 不支持目录 index 自动解析，引用本文件请写 "../config/index.js"。
 */
const API_BASE = "https://www.ccalm.xyz/api";

let TENCENT_MAP_KEY = "";
try {
  const local = require("./local.js");
  if (local && local.TENCENT_MAP_KEY) {
    TENCENT_MAP_KEY = String(local.TENCENT_MAP_KEY).trim();
  }
} catch (_) {
  // config/local.js 是可选的本地文件
}

module.exports = {
  API_BASE,
  TENCENT_MAP_KEY,
};
