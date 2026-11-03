const { getSession, clearSession } = require("./store/session");
const { isWechatReviewUsername } = require("./utils/review-account");
const { applyStatusBar } = require("./utils/theme");
const { resetNavMetrics } = require("./utils/nav-metrics");

// Maple Mono 只覆盖拉丁字符，且 base64 约 190KB。放在分包里，首屏渲染完成后再加载。
// require.async 的路径必须是字符串字面量，微信才会把该文件打进分包。

let fontsScheduled = false;

function mapleSource(fonts, key) {
  return `url("data:font/woff2;base64,${fonts[key]}")`;
}

function applyMapleFaces(fonts) {
  if (!fonts || !fonts.regular || !fonts.medium || !fonts.semibold) return;
  [
    ["400", "regular"],
    ["500", "medium"],
    ["600", "semibold"],
  ].forEach(([weight, key]) => {
    wx.loadFontFace({
      global: true,
      family: "Maple Mono",
      source: mapleSource(fonts, key),
      desc: { weight },
      fail() {},
    });
  });
}

function loadMapleFaces() {
  if (typeof require.async !== "function") return;
  require
    .async("./package-fonts/maple-fonts.js")
    .then((fonts) => {
      applyMapleFaces(fonts);
    })
    .catch(() => {});
}

function clearReviewSessionIfNeeded() {
  const session = getSession();
  const username = session && session.user && session.user.username;
  if (username && isWechatReviewUsername(username)) {
    clearSession();
  }
}

App({
  onLaunch() {
    clearReviewSessionIfNeeded();
    applyStatusBar();
    if (wx.onWindowResize) wx.onWindowResize(resetNavMetrics);
  },

  onShow() {
    applyStatusBar();
  },

  // 页面 onReady 之后调用，避免和首屏渲染抢 JS 线程与下载带宽。
  loadFontsAfterFirstPaint() {
    if (fontsScheduled) return;
    fontsScheduled = true;
    setTimeout(loadMapleFaces, 0);
  },
});
