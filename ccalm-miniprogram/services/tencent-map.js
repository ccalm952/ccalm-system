const { TENCENT_MAP_KEY } = require("../config/index.js");

const INFO_HINT = {
  311: "腾讯 Key 无效或未启用对应服务",
  306: "腾讯调用次数超限",
  110: "请求来源未授权（检查小程序 AppID / 域名白名单）",
};

function mapText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.join("").trim();
  return "";
}

/**
 * 去掉省、市、街道，保留区县和具体地点。
 */
function shortenAddress(formatted, component) {
  const full = mapText(formatted);
  if (!full || !component) return full;

  const province = mapText(component.province);
  const city = mapText(component.city);
  const street = mapText(component.street);

  let rest = full;
  if (province && rest.indexOf(province) === 0) {
    rest = rest.substring(province.length);
  }
  if (city && city !== province && rest.indexOf(city) === 0) {
    rest = rest.substring(city.length);
  }
  if (street && rest.indexOf(street) >= 0) {
    rest = rest.replace(street, "");
  }
  return rest.trim();
}

/**
 * 坐标转中文地址（腾讯逆地址解析）。
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{address:string, error:string}>}
 */
function reverseGeocode(latitude, longitude) {
  const key = (TENCENT_MAP_KEY || "").trim();
  if (!key) {
    return Promise.resolve({
      address: "",
      error: "未配置 TENCENT_MAP_KEY（config/local.js）",
    });
  }
  const location = `${latitude},${longitude}`;
  return new Promise((resolve) => {
    wx.request({
      url: "https://apis.map.qq.com/ws/geocoder/v1/",
      method: "GET",
      data: {
        key,
        location,
        get_poi: 0,
      },
      timeout: 8000,
      success(res) {
        const body = res.data || {};
        if (Number(body.status) !== 0) {
          const status = Number(body.status);
          const info = String(body.message || "逆地理失败");
          resolve({
            address: "",
            error: INFO_HINT[status] || `地址解析失败：${info}`,
          });
          return;
        }
        const result = body.result;
        if (!result) {
          resolve({ address: "", error: "" });
          return;
        }
        const recommend =
          result.formatted_addresses && result.formatted_addresses.recommend;
        resolve({
          address: shortenAddress(
            recommend || result.address,
            result.address_component,
          ),
          error: "",
        });
      },
      fail(error) {
        resolve({
          address: "",
          error:
            (error && error.errMsg) ||
            "无法访问腾讯位置服务（检查合法域名 apis.map.qq.com）",
        });
      },
    });
  });
}

module.exports = {
  reverseGeocode,
};
