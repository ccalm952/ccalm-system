/** 与现站同域：https://www.ccalm.xyz/api */
const API_BASE = "https://www.ccalm.xyz/api";

let AMAP_KEY = "";
try {
  const local = require("./config.local.js");
  if (local && local.AMAP_KEY) AMAP_KEY = String(local.AMAP_KEY).trim();
} catch (_) {
  // optional local override
}

module.exports = {
  API_BASE,
  AMAP_KEY,
};
