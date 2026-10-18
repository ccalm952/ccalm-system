/**
 * 状态栏、导航内容区、胶囊按钮、安全区尺寸（带缓存）。
 */

let metrics = null;
let capsule = null;
let navHeight = 0;

function readWindowMetrics() {
  if (metrics) return metrics;
  let info;
  try {
    info = wx.getWindowInfo();
  } catch (_) {
    info = undefined;
  }
  const statusBarHeight = (info && info.statusBarHeight) || 20;
  const windowWidth = (info && info.windowWidth) || 375;
  const windowHeight = (info && info.windowHeight) || 0;
  const screenHeight = (info && info.screenHeight) || windowHeight;
  const safeArea = (info && info.safeArea) || null;
  const safeAreaBottom = safeArea ? safeArea.bottom : screenHeight;
  metrics = {
    statusBarHeight,
    windowWidth,
    windowHeight,
    screenHeight,
    safeAreaBottom,
    safeBottom: Math.max(0, screenHeight - safeAreaBottom),
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
    menu = undefined;
  }
  const width = (menu && menu.width) || 87;
  const top = (menu && menu.top) || info.statusBarHeight + 6;
  const height = (menu && menu.height) || 32;
  const right = (menu && menu.right) || info.windowWidth - 16;
  const rightGap = Math.max(0, info.windowWidth - right);
  capsule = {
    top,
    width,
    height,
    right,
    rightGap,
    sidePadding: rightGap + width + rightGap,
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

module.exports = {
  readWindowMetrics,
  readCapsuleMetrics,
  navBarContentHeight,
};
