/**
 * 系统明暗主题读取与状态栏配色。
 */

function getTheme() {
  let theme = "light";
  try {
    const info = wx.getAppBaseInfo();
    if (info && info.theme === "dark") theme = "dark";
  } catch (_) {
    // ignore
  }
  return theme;
}

function applyStatusBar(theme) {
  const name = theme || getTheme();
  const dark = name === "dark";
  try {
    wx.setNavigationBarColor({
      frontColor: dark ? "#ffffff" : "#000000",
      backgroundColor: dark ? "#171413" : "#fdfdfd",
    });
    wx.setBackgroundColor({
      backgroundColor: dark ? "#171413" : "#fdfdfd",
    });
  } catch (_) {
    // ignore
  }
}

module.exports = {
  getTheme,
  applyStatusBar,
};
