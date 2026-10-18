const {
  readWindowMetrics,
  readCapsuleMetrics,
  navBarContentHeight,
} = require("../../../utils/nav-metrics");

Component({
  properties: {
    title: { type: String, value: "" },
  },

  data: {
    statusBarHeight: 20,
    navContentHeight: 44,
    sidePadding: 52,
  },

  lifetimes: {
    attached() {
      const metrics = readWindowMetrics();
      const capsule = readCapsuleMetrics();
      this.setData({
        statusBarHeight: metrics.statusBarHeight,
        navContentHeight: navBarContentHeight(),
        sidePadding: capsule.sidePadding,
      });
    },
  },
});
