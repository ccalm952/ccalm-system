const { TOAST_DURATION_MS } = require("../constants/ui");

/**
 * 顶部消息条行为：统一 toastText / toastType 和自动关闭逻辑。
 */
module.exports = Behavior({
  data: {
    toastText: "",
    toastType: "",
  },

  methods: {
    showToast(text, type) {
      const value = String(text || "");
      if (!value) return;
      this.clearToast();
      this.setData({ toastText: value, toastType: type || "" });
      this.toastTimer = setTimeout(() => this.clearToast(), TOAST_DURATION_MS);
    },

    showError(error, fallback) {
      if (!error || error.status === 401) return;
      this.showToast((error && error.message) || fallback, "error");
    },

    clearToast() {
      if (this.toastTimer) {
        clearTimeout(this.toastTimer);
        this.toastTimer = null;
      }
      this.setData({ toastText: "", toastType: "" });
    },
  },

  lifetimes: {
    detached() {
      this.clearToast();
    },
  },
});
