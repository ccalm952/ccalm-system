/** 与现站同域：https://www.ccalm.xyz/api */
const API_BASE = "https://www.ccalm.xyz/api"

/**
 * 高德 Web 服务 Key（与 ccalm-web/.env 的 VITE_AMAP_KEY 相同即可）。
 * 也可在同目录建 config.local.js：module.exports = { AMAP_KEY: "xxx" }
 */
let AMAP_KEY = ""
try {
  // eslint-disable-next-line import/no-unresolved
  const local = require("./config.local.js")
  if (local && local.AMAP_KEY) AMAP_KEY = String(local.AMAP_KEY).trim()
} catch (_) {
  // optional
}

module.exports = {
  API_BASE,
  AMAP_KEY,
}
