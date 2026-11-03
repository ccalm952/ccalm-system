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
      const statusBarHeight = metrics.statusBarHeight;
      const navContentHeight = navBarContentHeight();
      const sidePadding = capsule.sidePadding;
      if (
        statusBarHeight === this.data.statusBarHeight &&
        navContentHeight === this.data.navContentHeight &&
        sidePadding === this.data.sidePadding
      ) {
        return;
      }
      this.setData({ statusBarHeight, navContentHeight, sidePadding });
    },
  },
});
