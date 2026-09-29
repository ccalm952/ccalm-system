const { request, wxLoginCode } = require("../../utils/api")
const { setStoredAuth } = require("../../utils/auth")

Page({
  data: {
    step: "loading",
    bindTicket: "",
    username: "",
    password: "",
    submitting: false,
    error: "",
  },

  onLoad() {
    this.startWechatLogin()
  },

  onUsername(e) {
    this.setData({ username: e.detail.value })
  },

  onPassword(e) {
    this.setData({ password: e.detail.value })
  },

  async startWechatLogin() {
    this.setData({ step: "loading", error: "", bindTicket: "" })
    try {
      const code = await wxLoginCode()
      const res = await request("POST", "/auth/wechat/login", { code }, {
        skipAuth: true,
      })
      if (res.status === "bound") {
        setStoredAuth({
          accessToken: res.accessToken,
          deviceToken: res.deviceToken,
          user: res.user,
        })
        wx.reLaunch({ url: "/pages/punch/punch" })
        return
      }
      if (res.status === "need_bind") {
        this.setData({ step: "bind", bindTicket: res.bindTicket })
        return
      }
      this.setData({ step: "bind", error: "未知的登录状态" })
    } catch (err) {
      this.setData({
        step: "bind",
        error: err.message || "微信登录失败",
      })
    }
  },

  async onBind() {
    const { bindTicket, username, password, submitting } = this.data
    if (submitting) return
    if (!bindTicket) {
      this.setData({ error: "请先完成微信登录" })
      return
    }
    if (!username.trim() || !password) {
      this.setData({ error: "请填写账号和密码" })
      return
    }
    this.setData({ submitting: true, error: "" })
    try {
      const res = await request(
        "POST",
        "/auth/wechat/bind",
        {
          bindTicket,
          username: username.trim(),
          password,
        },
        { skipAuth: true }
      )
      setStoredAuth({
        accessToken: res.accessToken,
        deviceToken: res.deviceToken,
        user: res.user,
      })
      wx.reLaunch({ url: "/pages/punch/punch" })
    } catch (err) {
      this.setData({ error: err.message || "绑定失败" })
    } finally {
      this.setData({ submitting: false })
    }
  },
})
