const { getMonthlySummary } = require("../../../services/attendance");
const {
  approveRequest,
  fetchTodoState,
  rejectRequest,
} = require("../../../services/todo");
const {
  clearSession,
  getSession,
  requireSession,
} = require("../../../store/session");
const { readAvatar, saveAvatar } = require("../../../utils/avatar");
const { TAB_INDEX } = require("../../../constants/tabs");
const { LOGIN_PAGE } = require("../../../constants/routes");
const toastBehavior = require("../../../behaviors/toast");
const pullRefreshBehavior = require("../../../behaviors/pull-refresh");
const { formatDayCount, monthKey } = require("../../../utils/time");

const FUNCS = [
  { key: "month", label: "本月考勤", icon: "/assets/icons/month.png" },
  {
    key: "schedule",
    label: "我的排班",
    icon: "/assets/icons/schedule-func.png",
  },
  { key: "makeup", label: "补卡记录", icon: "/assets/icons/makeup.png" },
  { key: "logout", label: "退出登录", icon: "/assets/icons/logout.png" },
];

Component({
  behaviors: [toastBehavior, pullRefreshBehavior],

  properties: {
    active: { type: Boolean, value: false },
  },

  data: {
    displayName: "",
    avatarUrl: "",
    avatarText: "我",
    stats: [
      { label: "出勤", value: "--" },
      { label: "休息", value: "--" },
    ],
    funcs: FUNCS,
    pageLoading: false,
    isAdmin: false,
    badgeText: "",
    todoShow: false,
    todoTab: "mine",
    todoItems: [],
    mineItems: [],
    pendingItems: [],
    todoEmpty: "暂无申请记录",
  },

  observers: {
    active(value) {
      if (value) this.activate();
      else this.clearToast();
    },
  },

  lifetimes: {
    attached() {
      if (this.properties.active) this.activate();
    },
  },

  methods: {
    refresh() {
      if (!this.properties.active) return;
      const session = getSession();
      if (!session || !session.user) return;
      this.applyProfile(session);
      this.reload(false);
    },

    activate() {
      const session = requireSession();
      if (!session) return;
      this.applyProfile(session);
      this.reload(!this.loaded);
    },

    applyProfile(session) {
      const user = session.user || {};
      const displayName = user.displayName || user.username || "";
      this.userId = user.id || "";
      const next = {
        displayName,
        avatarUrl: readAvatar(this.userId),
        avatarText: displayName.slice(0, 1) || "我",
        isAdmin: user.role === "admin",
      };
      this.setData(next);
    },

    reload(showLoading) {
      if (this.loading) return;
      this.loading = true;
      if (showLoading || !this.loaded) {
        this.setData({ pageLoading: true });
      }
      Promise.all([this.loadMonth(), this.loadTodo(null)]).finally(() => {
        this.loading = false;
        this.loaded = true;
        this.setData({ pageLoading: false });
      });
    },

    async loadMonth() {
      try {
        const monthly = await getMonthlySummary(monthKey());
        this.setData({
          stats: [
            {
              label: "出勤",
              value: formatDayCount(monthly && monthly.attendanceDays),
            },
            {
              label: "休息",
              value: formatDayCount(monthly && monthly.restDays),
            },
          ],
        });
      } catch (error) {
        this.showError(error, "考勤加载失败");
      }
    },

    async loadTodo(tab) {
      try {
        const state = await fetchTodoState();
        const next = tab || this.data.todoTab;
        const todoItems = next === "pending" ? state.pending : state.mine;
        this.setData({
          isAdmin: state.isAdmin,
          badgeText: state.badge,
          mineItems: state.mine,
          pendingItems: state.pending,
          todoTab: next,
          todoItems,
          todoEmpty: next === "pending" ? "暂无待办" : "暂无申请记录",
        });
      } catch (error) {
        this.showError(error, "待办加载失败");
      }
    },

    async onChooseAvatar(event) {
      const detail = event.detail || {};
      const temporary = detail.avatarUrl || "";
      if (!temporary) return;
      try {
        const saved = await saveAvatar(this.userId, temporary);
        this.setData({ avatarUrl: saved });
      } catch (_) {
        this.setData({ avatarUrl: temporary });
      }
    },

    onTodoOpen() {
      const tab = this.data.isAdmin ? "pending" : "mine";
      this.setData({ todoShow: true });
      this.loadTodo(tab);
    },

    onTodoClose() {
      this.setData({ todoShow: false });
    },

    onTodoKeep() {},

    onTodoTab(event) {
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

    onTodoApprove(event) {
      return this.reviewTodo(event, true);
    },

    onTodoReject(event) {
      return this.reviewTodo(event, false);
    },

    async reviewTodo(event, approve) {
      if (this.reviewing) return;
      const data = event.currentTarget.dataset || {};
      const kind = String(data.kind || "");
      const id = String(data.id || "");
      if (!kind || !id) return;
      this.reviewing = true;
      const target = kind === "unbind" ? "解绑" : "补卡";
      try {
        await (approve ? approveRequest(kind, id) : rejectRequest(kind, id));
        this.showToast(
          `${approve ? "已通过" : "已拒绝"}${target}申请`,
          approve ? "success" : "error",
        );
        this.triggerEvent("attendancechanged");
        await this.loadTodo("pending");
      } catch (error) {
        this.showError(error, "操作失败");
      } finally {
        this.reviewing = false;
      }
    },

    onFunc(event) {
      const key = String(
        (event.currentTarget.dataset && event.currentTarget.dataset.key) || "",
      );
      if (key === "month") {
        this.triggerEvent("switchtab", { index: TAB_INDEX.PUNCH });
        return;
      }
      if (key === "schedule") {
        this.triggerEvent("switchtab", { index: TAB_INDEX.SCHEDULE });
        return;
      }
      if (key === "makeup") {
        this.setData({ todoShow: true });
        this.loadTodo("mine");
        return;
      }
      if (key === "logout") {
        wx.showModal({
          title: "退出登录",
          content: "确定退出当前账号？",
          success: (result) => {
            if (!result.confirm) return;
            clearSession();
            wx.reLaunch({ url: LOGIN_PAGE });
          },
        });
      }
    },

    onRefresherRefresh() {
      this.beginRefresh();
      Promise.all([this.loadMonth(), this.loadTodo(null)]).finally(() =>
        this.endRefresh(),
      );
    },

    noop() {},
  },
});
