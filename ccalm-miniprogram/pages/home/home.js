const { requireSession, hasSession } = require("../../store/session");
const { fetchTodoState } = require("../../services/todo");
const { fetchMissingCount } = require("../../services/badge");
const { badgeText } = require("../../utils/badge");
const { BADGE_REFRESH_MS } = require("../../constants/ui");
const { TABS, TAB_INDEX } = require("../../constants/tabs");
const { applyStatusBar, getTheme } = require("../../utils/theme");

Page({
  data: {
    activeIndex: TAB_INDEX.PUNCH,
    theme: "light",
    missingBadge: "",
    reviewBadge: "",
  },

  badgeTimer: null,
  badgeSeq: 0,
  badgeLoading: false,
  // 首次 onShow 交给 Tab 的首次 activate 加载，避免重复请求
  hasShown: false,

  onLoad() {
    this.applyTheme();
    this.bindThemeChange();
  },

  onShow() {
    if (!requireSession()) return;
    this.applyTheme();
    this.refreshBadges();
    this.startBadgeTimer();
    const firstShow = !this.hasShown;
    this.hasShown = true;
    if (!firstShow) this.refreshActive();
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

  onHide() {
    this.stopBadgeTimer();
  },

  onUnload() {
    this.stopBadgeTimer();
    this.unbindThemeChange();
  },

  onTabChange(event) {
    const index = Number(event.detail && event.detail.index);
    if (!Number.isFinite(index) || index < 0 || index >= TABS.length) return;
    if (index === this.data.activeIndex) return;
    this.setData({ activeIndex: index });
  },

  onAttendanceChanged() {
    this.refreshBadges();
  },

  refreshActive() {
    const tab = TABS[this.data.activeIndex];
    if (!tab) return;
    const target = this.selectComponent(`#${tab.component}`);
    if (target && typeof target.refresh === "function") {
      target.refresh();
    }
  },

  startBadgeTimer() {
    this.stopBadgeTimer();
    this.badgeTimer = setInterval(() => this.refreshBadges(), BADGE_REFRESH_MS);
  },

  stopBadgeTimer() {
    if (!this.badgeTimer) return;
    clearInterval(this.badgeTimer);
    this.badgeTimer = null;
  },

  // 同一时间只允许一个角标请求，避免定时器和操作事件重复触发
  async refreshBadges() {
    if (this.badgeLoading) return;
    if (!hasSession()) {
      this.setData({ missingBadge: "", reviewBadge: "" });
      return;
    }
    this.badgeLoading = true;
    const seq = (this.badgeSeq += 1);
    try {
      const [state, missing] = await Promise.all([
        fetchTodoState(),
        fetchMissingCount().catch(() => 0),
      ]);
      if (seq !== this.badgeSeq) return;
      const missingBadge = badgeText(missing);
      const reviewBadge = state.badge;
      if (
        missingBadge === this.data.missingBadge &&
        reviewBadge === this.data.reviewBadge
      ) {
        return;
      }
      this.setData({ missingBadge, reviewBadge });
    } catch (_) {
      // keep previous badges when refresh fails
    } finally {
      this.badgeLoading = false;
    }
  },
});
