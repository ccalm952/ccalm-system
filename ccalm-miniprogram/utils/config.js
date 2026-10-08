/** 正式站。本地可在 utils/config.local.js 覆盖 API_BASE / AMAP_KEY。 */
let API_BASE = "https://www.ccalm.xyz/api";

let AMAP_KEY = "";
try {
  const local = require("./config.local.js");
  if (local && local.API_BASE) {
    API_BASE = String(local.API_BASE).trim().replace(/\/+$/, "");
  }
  if (local && local.AMAP_KEY) AMAP_KEY = String(local.AMAP_KEY).trim();
} catch (_) {
  // optional local override
}

module.exports = {
  API_BASE,
  AMAP_KEY,
};
