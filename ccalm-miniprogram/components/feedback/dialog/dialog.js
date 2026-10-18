Component({
  options: {
    multipleSlots: true,
  },

  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: "" },
    message: { type: String, value: "" },
    confirmText: { type: String, value: "确认" },
    cancelText: { type: String, value: "取消" },
    showCancel: { type: Boolean, value: true },
    loading: { type: Boolean, value: false },
    confirmDisabled: { type: Boolean, value: false },
    closeable: { type: Boolean, value: true },
    maskClosable: { type: Boolean, value: true },
    body: { type: Boolean, value: false },
    extra: { type: Boolean, value: false },
    centerStyle: { type: String, value: "" },
    panelStyle: { type: String, value: "" },
  },

  methods: {
    noop() {},

    onCancel() {
      if (this.data.loading) return;
      this.triggerEvent("cancel");
    },

    onConfirm() {
      if (this.data.loading || this.data.confirmDisabled) return;
      this.triggerEvent("confirm");
    },

    onMask() {
      if (this.data.maskClosable) this.onCancel();
    },
  },
});
