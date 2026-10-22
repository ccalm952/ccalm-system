const {
  PULL_THRESHOLD,
  PULL_OFFSET,
  PULL_MAX,
  PULL_EPSILON,
} = require("../constants/ui");

/**
 * 下拉刷新行为：统一刷新状态、下拉距离和指示器位置。
 * 组件只需要实现 onRefresherRefresh，并在开始时调用 beginRefresh、结束时调用 endRefresh。
 */
module.exports = Behavior({
  data: {
    refreshing: false,
    pullDistance: 0,
    pullY: -PULL_OFFSET,
    pullOpacity: 0,
    pullThreshold: PULL_THRESHOLD,
  },

  methods: {
    beginRefresh() {
      this.lastPullDistance = undefined;
      this.setData({
        refreshing: true,
        pullDistance: this.data.pullThreshold,
        pullY: Math.min(this.data.pullThreshold, PULL_MAX) - PULL_OFFSET,
        pullOpacity: 1,
      });
    },

    endRefresh() {
      this.lastPullDistance = 0;
      this.setData({
        refreshing: false,
        pullDistance: 0,
        pullY: -PULL_OFFSET,
        pullOpacity: 0,
      });
    },

    updatePull(distance) {
      const current = Math.max(0, Math.min(Number(distance) || 0, PULL_MAX));
      const opacity =
        current > 0 ? Math.min(1, current / this.data.pullThreshold) : 0;
      this.setData({
        pullDistance: current,
        pullY: Math.min(current, PULL_MAX) - PULL_OFFSET,
        pullOpacity: opacity,
      });
    },

    onRefresherPulling(event) {
      const distance = Number(event.detail && event.detail.dy) || 0;
      if (
        this.lastPullDistance !== undefined &&
        Math.abs(distance - this.lastPullDistance) < PULL_EPSILON
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
