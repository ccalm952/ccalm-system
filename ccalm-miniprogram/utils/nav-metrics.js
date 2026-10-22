/**
 * 状态栏、导航内容区、胶囊按钮、安全区尺寸（带缓存）。
 */

let metrics = null;
let capsule = null;
let navHeight = 0;

function readWindowMetrics() {
  if (metrics) return metrics;
  const info = wx.getWindowInfo();
  const safeAreaBottom = info.safeArea.bottom;
  metrics = {
    statusBarHeight: info.statusBarHeight,
    windowWidth: info.windowWidth,
    windowHeight: info.windowHeight,
    screenHeight: info.screenHeight,
    safeAreaBottom,
    safeBottom: info.screenHeight - safeAreaBottom,
  };
  return metrics;
}

/**
 * 胶囊按钮尺寸，以及胶囊到屏幕右边的距离。
 */
function readCapsuleMetrics() {
  if (capsule) return capsule;
  const info = readWindowMetrics();
  const menu = wx.getMenuButtonBoundingClientRect();
  const rightGap = info.windowWidth - menu.right;
  capsule = {
    top: menu.top,
    width: menu.width,
    height: menu.height,
    right: menu.right,
    rightGap,
    sidePadding: rightGap + menu.width + rightGap,
  };
  return capsule;
}

/** 自定义导航标题行高度，与胶囊按钮垂直居中 */
function navBarContentHeight() {
  if (navHeight > 0) return navHeight;
  const menu = readCapsuleMetrics();
  const gap = menu.top - readWindowMetrics().statusBarHeight;
  navHeight = menu.height + gap * 2;
  return navHeight;
}

function resetNavMetrics() {
  metrics = null;
  capsule = null;
  navHeight = 0;
}

module.exports = {
  readWindowMetrics,
  readCapsuleMetrics,
  navBarContentHeight,
  resetNavMetrics,
};
