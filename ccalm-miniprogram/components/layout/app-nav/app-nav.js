const {
  readWindowMetrics,
  readCapsuleMetrics,
  navBarContentHeight,
  resetNavMetrics,
} = require("../../../utils/nav-metrics");

const initialMetrics = readWindowMetrics();
const initialCapsule = readCapsuleMetrics();

function toastMaxWidth(metrics, capsule) {
  const center = metrics.windowWidth / 2;
  const left = capsule.rightGap;
  const right = metrics.windowWidth - capsule.sidePadding;
  return Math.max(0, 2 * Math.min(center - left, right - center));
}

Component({
  properties: {
    title: { type: String, value: "" },
    toastText: { type: String, value: "" },
    toastType: { type: String, value: "" },
  },

  data: {
    statusBarHeight: initialMetrics.statusBarHeight,
    navContentHeight: navBarContentHeight(),
    sidePadding: initialCapsule.sidePadding,
    rightGap: initialCapsule.rightGap,
    toastMaxWidth: toastMaxWidth(initialMetrics, initialCapsule),
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
      const rightGap = capsule.rightGap;
      const nextToastMaxWidth = toastMaxWidth(metrics, capsule);
      if (
        statusBarHeight === this.data.statusBarHeight &&
        navContentHeight === this.data.navContentHeight &&
        sidePadding === this.data.sidePadding &&
        rightGap === this.data.rightGap &&
        nextToastMaxWidth === this.data.toastMaxWidth
      ) {
        return;
      }
      this.setData({
        statusBarHeight,
        navContentHeight,
        sidePadding,
        rightGap,
        toastMaxWidth: nextToastMaxWidth,
      });
    },
  },
});
