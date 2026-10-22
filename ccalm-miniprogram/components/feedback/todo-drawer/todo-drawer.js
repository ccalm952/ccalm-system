const {
  approveRequest,
  fetchTodoState,
  rejectRequest,
} = require("../../../services/todo");

Component({
  properties: {
    show: { type: Boolean, value: false },
  },

  data: {
    isAdmin: false,
    todoTab: "mine",
    todoItems: [],
    mineItems: [],
    pendingItems: [],
    todoEmpty: "暂无申请记录",
  },

  observers: {
    show(value) {
      if (value) this.loadTodo(null);
    },
  },

  methods: {
    async loadTodo(tab) {
      try {
        const state = await fetchTodoState();
        const next = tab || (state.isAdmin ? "pending" : "mine");
        this.setData({
          isAdmin: state.isAdmin,
          todoTab: next,
          mineItems: state.mine,
          pendingItems: state.pending,
          todoItems: next === "pending" ? state.pending : state.mine,
          todoEmpty: next === "pending" ? "暂无待办" : "暂无申请记录",
        });
      } catch (_) {
        wx.showToast({ title: "待办加载失败", icon: "none" });
      }
    },

    onClose() {
      this.triggerEvent("close");
    },

    onKeep() {},

    noop() {},

    onTab(event) {
      const tab = String(
        (event.currentTarget.dataset && event.currentTarget.dataset.tab) || "",
      );
      if (!tab || tab === this.data.todoTab) return;
      this.setData({
        todoTab: tab,
        todoItems:
          tab === "pending" ? this.data.pendingItems : this.data.mineItems,
        todoEmpty: tab === "pending" ? "暂无待办" : "暂无申请记录",
      });
    },

    onApprove(event) {
      return this.review(event, true);
    },

    onReject(event) {
      return this.review(event, false);
    },

    async review(event, approve) {
      if (this.reviewing) return;
      const data = event.currentTarget.dataset || {};
      const kind = String(data.kind || "");
      const id = String(data.id || "");
      if (!kind || !id) return;
      this.reviewing = true;
      try {
        await (approve ? approveRequest(kind, id) : rejectRequest(kind, id));
        wx.showToast({
          title: approve ? "已通过" : "已拒绝",
          icon: "none",
        });
        this.triggerEvent("changed");
        await this.loadTodo("pending");
      } catch (_) {
        wx.showToast({ title: "操作失败", icon: "none" });
      } finally {
        this.reviewing = false;
      }
    },
  },
});
