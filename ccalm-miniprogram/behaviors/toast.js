/**
 * 顶部消息条行为：只把消息抛给页面，由页面统一显示在导航栏。
 */
module.exports = Behavior({
  methods: {
    showToast(text, type) {
      const value = String(text || "");
      if (!value) return;
      this.triggerEvent("toast", {
        text: value,
        type: type || "",
      });
    },

    showError(error, fallback) {
      if (!error || error.status === 401) return;
      this.showToast((error && error.message) || fallback, "error");
    },

    clearToast() {
      // 自动关闭由页面统一处理，Tab 切换不影响当前提示。
    },
  },
});
