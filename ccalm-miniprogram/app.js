const { getStoredAuth } = require("./utils/auth")

App({
  onLaunch() {
    const auth = getStoredAuth()
    if (auth?.accessToken && auth?.deviceToken) {
      wx.reLaunch({ url: "/pages/punch/punch" })
    }
  },
})
