/**
 * 页面布局常量与尺寸计算。
 * 表格高度、底栏高度等数值集中在这里，避免各组件散落魔法数字。
 */

const PAGE_PADDING = 16;
const CARD_PADDING = 16;
const CARD_GAP = 16;
const TABLE_HEADER_HEIGHT = 40;
// 行高 40px + 1px 分隔线
const TABLE_ROW_HEIGHT = 41;
const TAB_BAR_HEIGHT = 56;
const TAB_BAR_SAFE_GAP = 16;

/** 底部 tab 栏总高度：内容高度 + 安全区上方的间距 + 安全区 */
function tabBarHeight(metrics) {
  const top = metrics.safeBottom - TAB_BAR_SAFE_GAP;
  return TAB_BAR_HEIGHT + top + metrics.safeBottom;
}

/** 表格内容高度：表头 + 数据行 */
function tableContentHeight(rowCount) {
  return TABLE_HEADER_HEIGHT + rowCount * TABLE_ROW_HEIGHT;
}

module.exports = {
  PAGE_PADDING,
  CARD_PADDING,
  CARD_GAP,
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  TAB_BAR_HEIGHT,
  tabBarHeight,
  tableContentHeight,
};
