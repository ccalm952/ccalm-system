let Toast;
try {
  const mod = require("../miniprogram_npm/@vant/weapp/toast/toast");
  Toast = mod && (mod.default || mod);
} catch (_) {
  Toast = null;
}

function show(message, type) {
  const text = String(message || "");
  if (typeof Toast === "function") {
    if (type === "success" && Toast.success) {
      Toast.success(text);
      return;
    }
    if (type === "fail" && Toast.fail) {
      Toast.fail(text);
      return;
    }
    Toast(text);
    return;
  }
  wx.showToast({
    title: text.slice(0, 14),
    icon: type === "success" ? "success" : type === "fail" ? "none" : "none",
    duration: 2000,
  });
}

module.exports = {
  toast: (msg) => show(msg, "text"),
  success: (msg) => show(msg, "success"),
  fail: (msg) => show(msg, "fail"),
};
