const { getSession, clearSession } = require("./store/session");
const { isWechatReviewUsername } = require("./utils/review-account");
const { applyStatusBar } = require("./utils/theme");
const { resetNavMetrics } = require("./utils/nav-metrics");
const mapleFonts = require("./assets/fonts/maple-fonts");

// 真机 wx.loadFontFace 不读取本地 assets 路径，使用 base64 内嵌字体。
function mapleSource(key) {
  return `url("data:font/woff2;base64,${mapleFonts[key]}")`;
}

function loadMapleFaces() {
  const faces = [
    {
      weight: "400",
      source: mapleSource("regular"),
    },
    {
      weight: "500",
      source: mapleSource("medium"),
    },
    {
      weight: "600",
      source: mapleSource("semibold"),
    },
  ];
  faces.forEach(({ weight, source }) => {
    wx.loadFontFace({
      global: true,
      family: "Maple Mono",
      source,
      desc: { weight },
    });
  });
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
    loadMapleFaces();
    clearReviewSessionIfNeeded();
    applyStatusBar();
    if (wx.onWindowResize) wx.onWindowResize(resetNavMetrics);
  },

  onShow() {
    applyStatusBar();
  },
});
