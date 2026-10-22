const {
  readWindowMetrics,
  readCapsuleMetrics,
  navBarContentHeight,
  resetNavMetrics,
} = require("../../../utils/nav-metrics");

const initialMetrics = readWindowMetrics();
const initialCapsule = readCapsuleMetrics();

Component({
  properties: {
    title: { type: String, value: "" },
  },

  data: {
    statusBarHeight: initialMetrics.statusBarHeight,
    navContentHeight: navBarContentHeight(),
    sidePadding: initialCapsule.sidePadding,
  },

  lifetimes: {
    attached() {
      this.updateMetrics();
    },
  },

  pageLifetimes: {
    resize() {
      resetNavMetrics();
      this.updateMetrics();
    },
  },

  methods: {
    updateMetrics() {
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
