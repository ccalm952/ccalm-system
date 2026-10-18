const { loginWithWechat, bindWechatAccount } = require("../../services/auth");
const { hasSession } = require("../../store/session");
const { HOME_PAGE } = require("../../constants/routes");
const { applyStatusBar, getTheme } = require("../../utils/theme");

Page({
  data: {
    step: "loading",
    bindTicket: "",
    username: "",
    password: "",
    submitting: false,
    error: "",
    theme: "light",
  },

  onLoad(query) {
    this.applyTheme();
    this.bindThemeChange();
    if (query && query.preview === "1") {
      this.setData({ step: "bind", bindTicket: "" });
      return;
    }
    if (hasSession()) {
      wx.reLaunch({ url: HOME_PAGE });
      return;
    }
    this.startWechatLogin();
  },

  onShow() {
    this.applyTheme();
  },

  applyTheme(theme) {
    const next = theme === "dark" || theme === "light" ? theme : getTheme();
    if (next !== this.data.theme) this.setData({ theme: next });
    applyStatusBar(next);
  },

  bindThemeChange() {
    if (typeof wx.onThemeChange !== "function") return;
    this.themeHandler = (res) => this.applyTheme(res && res.theme);
    wx.onThemeChange(this.themeHandler);
  },

  unbindThemeChange() {
    if (this.themeHandler && typeof wx.offThemeChange === "function") {
      wx.offThemeChange(this.themeHandler);
    }
    this.themeHandler = null;
  },

  onUnload() {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }
    this.unbindThemeChange();
  },

  onUsername(event) {
    this.setData({
      username: String((event.detail && event.detail.value) || ""),
    });
  },

  onPassword(event) {
    this.setData({
      password: String((event.detail && event.detail.value) || ""),
    });
  },

  async startWechatLogin() {
    this.setData({ step: "loading", error: "", bindTicket: "" });
    try {
      const result = await loginWithWechat();
      if (result.status === "bound") {
        if (!result.session) {
          this.setData({ step: "bind", error: "登录数据不完整" });
          return;
        }
        wx.reLaunch({ url: HOME_PAGE });
        return;
      }
      if (result.status === "need_bind") {
        this.setData({ step: "bind", bindTicket: result.bindTicket || "" });
        return;
      }
      this.setData({ step: "bind", error: "未知的登录状态" });
    } catch (error) {
      this.setData({
        step: "bind",
        error: (error && error.message) || "微信登录失败",
      });
    }
  },

  async onBind() {
    const { bindTicket, username, password, submitting } = this.data;
    if (submitting) return;
    if (!bindTicket) {
      this.setData({ error: "请先完成微信登录" });
      return;
    }
    if (!String(username || "").trim() || !password) {
      this.setData({ error: "请填写账号和密码" });
      return;
    }
    this.setData({ submitting: true, error: "" });
    try {
      await bindWechatAccount({
        bindTicket,
        username: String(username).trim(),
        password,
      });
      wx.showToast({ title: "绑定成功", icon: "success", duration: 800 });
      this.redirectTimer = setTimeout(() => {
        this.redirectTimer = null;
        this.setData({ submitting: false });
        wx.reLaunch({ url: HOME_PAGE });
      }, 800);
    } catch (error) {
      this.setData({
        error: (error && error.message) || "绑定失败",
        submitting: false,
      });
    }
  },
});
