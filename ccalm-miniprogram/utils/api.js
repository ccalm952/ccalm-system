const { API_BASE } = require("./config")
const { getStoredAuth, clearStoredAuth } = require("./auth")

function request(method, path, data, opts = {}) {
  const auth = getStoredAuth()
  const header = {
    "content-type": "application/json",
    ...(opts.header || {}),
  }
  if (!opts.skipAuth && auth?.accessToken) {
    header.Authorization = `Bearer ${auth.accessToken}`
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}${path}`,
      method,
      data,
      header,
      success(res) {
        const status = res.statusCode || 0
        const body = res.data
        if (status >= 200 && status < 300) {
          resolve(body)
          return
        }
        if (status === 401 && !opts.skipAuth) {
          clearStoredAuth()
        }
        let message = `请求失败 (${status})`
        if (body && body.message != null) {
          message = Array.isArray(body.message)
            ? body.message.join("；")
            : String(body.message)
        } else if (body && body.error) {
          message = String(body.error)
        }
        const err = new Error(message)
        err.status = status
        err.body = body
        reject(err)
      },
      fail(err) {
        reject(new Error(err.errMsg || "网络错误"))
      },
    })
  })
}

function wxLoginCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) resolve(res.code)
        else reject(new Error("微信登录失败：无 code"))
      },
      fail(err) {
        reject(new Error(err.errMsg || "微信登录失败"))
      },
    })
  })
}

function getLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: "gcj02",
      isHighAccuracy: true,
      success(res) {
        resolve({ latitude: res.latitude, longitude: res.longitude })
      },
      fail(err) {
        reject(new Error(err.errMsg || "获取定位失败，请在设置中开启位置权限"))
      },
    })
  })
}

module.exports = {
  request,
  wxLoginCode,
  getLocation,
}
