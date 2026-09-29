const { AMAP_KEY } = require("./config")

function reverseGeocode(latitude, longitude) {
  const key = (AMAP_KEY || "").trim()
  if (!key) {
    return Promise.resolve("")
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
          resolve("")
          return
        }
        const address =
          (body.regeocode && body.regeocode.formatted_address) || ""
        resolve(String(address).trim())
      },
      fail() {
        resolve("")
      },
    })
  })
}

module.exports = {
  reverseGeocode,
}
