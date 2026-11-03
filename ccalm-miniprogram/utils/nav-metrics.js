/**
 * 状态栏、导航内容区、胶囊按钮、安全区尺寸（带缓存）。
 */

let metrics = null;
let capsule = null;
let navHeight = 0;

function emptyWindowMetrics() {
  return {
    statusBarHeight: 0,
    windowWidth: 0,
    windowHeight: 0,
    screenHeight: 0,
    safeAreaBottom: 0,
    safeBottom: 0,
  };
}

function readWindowMetrics() {
  if (metrics) return metrics;
  let info;
  try {
    info = wx.getWindowInfo();
  } catch (_) {
    info = null;
  }
  if (!info) return emptyWindowMetrics();
  const safeArea = info.safeArea || {};
  const screenHeight = info.screenHeight || 0;
  const safeAreaBottom =
    safeArea.bottom != null ? safeArea.bottom : screenHeight;
  metrics = {
    statusBarHeight: info.statusBarHeight || 0,
    windowWidth: info.windowWidth || 0,
    windowHeight: info.windowHeight || 0,
    screenHeight,
    safeAreaBottom,
    safeBottom: screenHeight - safeAreaBottom,
  };
  return metrics;
}

/**
 * 胶囊按钮尺寸，以及胶囊到屏幕右边的距离。
 */
function readCapsuleMetrics() {
  if (capsule) return capsule;
  const info = readWindowMetrics();
  let menu;
  try {
    menu = wx.getMenuButtonBoundingClientRect();
  } catch (_) {
    menu = null;
  }
  if (!menu) {
    return {
      top: info.statusBarHeight,
      width: 0,
      height: 0,
      right: info.windowWidth,
      rightGap: 0,
      sidePadding: 0,
    };
  }
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
