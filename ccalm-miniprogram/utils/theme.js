const WALLPAPER = {
  light: "/assets/background-mobile-light.jpg",
  dark: "/assets/background-mobile-dark.jpg",
};

function resolveTheme() {
  try {
    if (typeof wx.getAppBaseInfo === "function") {
      const info = wx.getAppBaseInfo();
      if (info && info.theme === "dark") return "dark";
    }
  } catch (_) {
    // fall through
  }
  try {
    const info = wx.getSystemInfoSync();
    if (info && info.theme === "dark") return "dark";
  } catch (_) {
    // fall through
  }
  return "light";
}

function wallpaperSrc(theme) {
  return WALLPAPER[theme === "dark" ? "dark" : "light"];
}

/** 绑定系统主题 → wallpaperSrc；返回 off 函数 */
function bindWallpaper(page) {
  const apply = (theme) => {
    page.setData({ wallpaperSrc: wallpaperSrc(theme) });
  };
  apply(resolveTheme());
  const onChange = (res) => apply(res && res.theme);
  if (typeof wx.onThemeChange === "function") {
    wx.onThemeChange(onChange);
  }
  return () => {
    if (typeof wx.offThemeChange === "function") {
      wx.offThemeChange(onChange);
    }
  };
}

module.exports = {
  wallpaperSrc,
  bindWallpaper,
};
