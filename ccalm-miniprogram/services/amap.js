const { AMAP_KEY } = require("../config/index.js");

const INFO_HINT = {
  USERKEY_PLAT_NOMATCH:
    "高德 Key 类型不对：请用「Web服务」Key，不能用网页 JS API Key",
  INVALID_USER_KEY: "高德 Key 无效",
  DAILY_QUERY_OVER_LIMIT: "高德调用次数超限",
  IP_QUERY_OVER_LIMIT: "高德调用次数超限",
  ACCESS_TOO_FREQUENT: "高德调用过于频繁",
};

function amapText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.join("").trim();
  return "";
}

/**
 * 去掉省、市、街道，保留区县和具体地点。
 */
function shortenAddress(formatted, component) {
  const full = amapText(formatted);
  if (!full || !component) return full;

  const province = amapText(component.province);
  const city = amapText(component.city);
  const township = amapText(component.township);

  let rest = full;
  if (province && rest.indexOf(province) === 0) {
    rest = rest.substring(province.length);
  }
  if (city && city !== province && rest.indexOf(city) === 0) {
    rest = rest.substring(city.length);
  }
  if (township && rest.indexOf(township) >= 0) {
    rest = rest.replace(township, "");
  }
  return rest.trim();
}

/**
 * 坐标转中文地址。
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{address:string, error:string}>}
 */
function reverseGeocode(latitude, longitude) {
  const key = (AMAP_KEY || "").trim();
  if (!key) {
    return Promise.resolve({
      address: "",
      error: "未配置 AMAP_KEY（config/local.js）",
    });
  }
  const location = `${longitude},${latitude}`;
  return new Promise((resolve) => {
    wx.request({
      url: "https://restapi.amap.com/v3/geocode/regeo",
      method: "GET",
      data: {
        key,
        location,
        extensions: "base",
      },
      timeout: 8000,
      success(res) {
        const body = res.data || {};
        if (String(body.status) !== "1") {
          const info = String(body.info || "逆地理失败");
          resolve({
            address: "",
            error: INFO_HINT[info] || `地址解析失败：${info}`,
          });
          return;
        }
        if (!body.regeocode) {
          resolve({ address: "", error: "" });
          return;
        }
        resolve({
          address: shortenAddress(
            body.regeocode.formatted_address,
            body.regeocode.addressComponent,
          ),
          error: "",
        });
      },
      fail(error) {
        resolve({
          address: "",
          error:
            (error && error.errMsg) ||
            "无法访问高德（检查合法域名 restapi.amap.com）",
        });
      },
    });
  });
}

module.exports = {
  reverseGeocode,
};
