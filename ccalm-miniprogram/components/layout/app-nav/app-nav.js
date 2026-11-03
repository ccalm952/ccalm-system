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
      this.setData({
        statusBarHeight: metrics.statusBarHeight,
        navContentHeight: navBarContentHeight(),
        sidePadding: capsule.sidePadding,
        rightGap: capsule.rightGap,
        toastMaxWidth: toastMaxWidth(metrics, capsule),
      });
    },
  },
});
