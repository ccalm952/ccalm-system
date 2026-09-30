const { AMAP_KEY } = require("./config")

const INFO_HINT = {
  USERKEY_PLAT_NOMATCH:
    "高德 Key 类型不对：请用「Web服务」Key，不能用网页 JS API Key",
  INVALID_USER_KEY: "高德 Key 无效",
  DAILY_QUERY_OVER_LIMIT: "高德调用次数超限",
  IP_QUERY_OVER_LIMIT: "高德调用次数超限",
  ACCESS_TOO_FREQUENT: "高德调用过于频繁",
}

function reverseGeocode(latitude, longitude) {
  const key = (AMAP_KEY || "").trim()
  if (!key) {
    return Promise.resolve({
      address: "",
      error: "未配置 AMAP_KEY（utils/config.local.js）",
    })
  }
  const location = `${longitude},${latitude}`
  return new Promise((resolve) => {
    wx.request({
      url: "https://restapi.amap.com/v3/geocode/regeo",
      method: "GET",
      data: {
        key,
        location,
        extensions: "base",
      },
      success(res) {
        const body = res.data || {}
        if (String(body.status) !== "1") {
          const info = String(body.info || "逆地理失败")
          resolve({
            address: "",
            error: INFO_HINT[info] || `地址解析失败：${info}`,
          })
          return
        }
        const address =
          (body.regeocode && body.regeocode.formatted_address) || ""
        resolve({ address: String(address).trim(), error: "" })
      },
      fail(err) {
        resolve({
          address: "",
          error: (err && err.errMsg) || "无法访问高德（检查合法域名 restapi.amap.com）",
        })
      },
    })
  })
}

module.exports = {
  reverseGeocode,
}
