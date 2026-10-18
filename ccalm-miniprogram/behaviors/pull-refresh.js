const { PULL_THRESHOLD } = require("../constants/ui");

/**
 * 下拉刷新行为：统一刷新状态、下拉距离和指示器位置。
 * 组件只需要实现 onRefresherRefresh，并在开始时调用 beginRefresh、结束时调用 endRefresh。
 */
module.exports = Behavior({
  data: {
    refreshing: false,
    pullDistance: 0,
    pullY: -40,
    pullOpacity: 0,
    pullThreshold: PULL_THRESHOLD,
  },

  methods: {
    beginRefresh() {
      this.lastPullDistance = undefined;
      this.setData({
        refreshing: true,
        pullDistance: this.data.pullThreshold,
        pullY: Math.min(this.data.pullThreshold, 70) - 40,
        pullOpacity: 1,
      });
    },

    endRefresh() {
      this.lastPullDistance = 0;
      this.setData({
        refreshing: false,
        pullDistance: 0,
        pullY: -40,
        pullOpacity: 0,
      });
    },

    updatePull(distance) {
      const current = Math.max(0, Math.min(Number(distance) || 0, 200));
      const opacity =
        current > 0 ? Math.min(1, current / this.data.pullThreshold) : 0;
      this.setData({
        pullDistance: current,
        pullY: Math.min(current, 70) - 40,
        pullOpacity: opacity,
      });
    },

    onRefresherPulling(event) {
      const distance = Number(event.detail && event.detail.dy) || 0;
      if (
        this.lastPullDistance !== undefined &&
        Math.abs(distance - this.lastPullDistance) < 2
      ) {
        return;
      }
      this.lastPullDistance = distance;
      this.updatePull(distance);
    },

    onRefresherRestore() {
      this.lastPullDistance = 0;
      this.updatePull(0);
    },

    onRefresherAbort() {
      this.lastPullDistance = 0;
      this.updatePull(0);
    },
  },
});
