const {
  getAttendanceBundle,
  listMyMakeupRequests,
  declareRest,
  clearRest,
  createMakeupRequest,
} = require("../../../services/attendance");
const { requireSession } = require("../../../store/session");
const toastBehavior = require("../../../behaviors/toast");
const pullRefreshBehavior = require("../../../behaviors/pull-refresh");
const {
  buildAttendanceRow,
  dateDisplay,
  missingCount,
  restConfirmMessage,
} = require("../../../utils/attendance-table");
const {
  PUNCH_LABEL,
  DEFAULT_MAKEUP_TIME,
} = require("../../../utils/punch-rule");
const { monthKey } = require("../../../utils/time");

Component({
  behaviors: [toastBehavior, pullRefreshBehavior],

  properties: {
    active: { type: Boolean, value: false },
  },

  data: {
    count: "0",
    tone: "muted",
    monthRows: [],
    tableHeight: 0,
    pageLoading: false,
    dialogShow: false,
    restDialogShow: false,
    restDialogTitle: "",
    restDialogMessage: "",
    makeupDate: "",
    makeupDateLabel: "",
    makeupType: "",
    makeupTypeLabel: "",
    makeupTime: "08:30",
    makeupSubmitting: false,
  },

  observers: {
    active(value) {
      if (value) this.activate();
      else this.deactivate();
    },
  },

  lifetimes: {
    attached() {
      if (this.properties.active) this.activate();
    },
    detached() {
      this.deactivate();
    },
  },

  methods: {
    refresh() {
      if (!this.properties.active) return;
      if (this.loading) return;
      if (!this.loaded) {
        this.activate();
        return;
      }
      this.loading = true;
      this.reloadAll().finally(() => {
        this.loading = false;
      });
    },

    activate() {
      if (!requireSession()) return;
      if (this.loading) return;
      if (this.loaded) return;
      this.loading = true;
      this.setData({ pageLoading: true });
      this.reloadAll()
        .then((ok) => {
          if (ok) this.loaded = true;
        })
        .finally(() => {
          this.loading = false;
          this.setData({ pageLoading: false });
        });
    },

    deactivate() {
      this.clearToast();
    },

    async reloadAll() {
      try {
        const month = monthKey();
        const [bundle, makeups] = await Promise.all([
          getAttendanceBundle(month),
          listMyMakeupRequests("pending").catch(() => []),
        ]);
        this.shift = bundle.shift || null;
        this.sourceRows = (bundle.monthly && bundle.monthly.rows) || [];
        this.makeupRequests = Array.isArray(makeups) ? makeups : [];
        const at = new Date();
        const total = missingCount(
          this.sourceRows,
          this.shift,
          this.makeupRequests,
          at,
        );
        const rows = this.sourceRows
          .map((row) =>
            buildAttendanceRow(row, this.shift, this.makeupRequests, at),
          )
          .filter((row) =>
            row.slots.some((entry) =>
              entry.cell.actions.some((action) => action.kind === "makeup"),
            ),
          );
        this.setData(
          {
            count: String(total),
            tone: total > 0 ? "warn" : "muted",
            monthRows: rows,
          },
          () => this.updateTableHeight(rows.length),
        );
        return true;
      } catch (error) {
        this.showError(error, "加载失败");
        return false;
      }
    },

    updateTableHeight(rowCount) {
      const count = Number(rowCount) || 0;
      if (!count) {
        this.setData({ tableHeight: 0 });
        return;
      }
      wx.nextTick(() => {
        const query = wx.createSelectorQuery().in(this);
        query.select(".missing-page").boundingClientRect();
        query.select(".head").boundingClientRect();
        query.exec((res) => {
          const page = res && res[0];
          const head = res && res[1];
          if (!page) return;
          const headHeight = head ? head.height : 40;
          const available = Math.max(
            81,
            page.height - 32 - 32 - headHeight - 16,
          );
          const content = 40 + count * 41;
          this.setData({ tableHeight: Math.min(content, available) });
        });
      });
    },

    onCellActionTap(event) {
      const data = event.currentTarget.dataset || {};
      const half = data.half && data.half !== "null" ? String(data.half) : null;
      const type = data.type && data.type !== "null" ? String(data.type) : null;
      this.handleAction({
        date: String(data.date || ""),
        kind: String(data.kind || ""),
        half,
        type,
      });
    },

    handleAction(action) {
      if (action.kind === "makeup" && action.type) {
        this.setData({
          dialogShow: true,
          restDialogShow: false,
          makeupDate: action.date,
          makeupDateLabel: dateDisplay(action.date),
          makeupType: action.type,
          makeupTypeLabel: PUNCH_LABEL[action.type] || action.type,
          makeupTime: DEFAULT_MAKEUP_TIME[action.type] || "08:30",
        });
        return;
      }
      if (!action.half) return;
      const row =
        (this.sourceRows || []).find((item) => item.date === action.date) ||
        null;
      if (!row) return;
      const clearing = action.kind === "clearRest";
      this.restPending = {
        date: action.date,
        half: action.half,
        clearing,
      };
      this.setData({
        dialogShow: true,
        restDialogShow: true,
        restDialogTitle: clearing ? "取消休息" : "登记休息",
        restDialogMessage: restConfirmMessage(row, action.half, clearing),
      });
    },

    onDialogClose() {
      if (this.data.restDialogShow) {
        this.onRestClose();
        return;
      }
      this.onMakeupClose();
    },

    onDialogConfirm() {
      if (this.data.restDialogShow) {
        this.onRestConfirm();
        return;
      }
      this.onMakeupSubmit();
    },

    onRestClose() {
      this.setData({ restDialogShow: false, dialogShow: false });
      this.restPending = null;
    },

    async onRestConfirm() {
      const pending = this.restPending;
      if (!pending || this.restSubmitting) return;
      this.restSubmitting = true;
      try {
        const body = { date: pending.date, half: pending.half };
        if (pending.clearing) {
          await clearRest(body);
          this.showToast("已取消休息登记", "success");
        } else {
          await declareRest(body);
          this.showToast("休息登记成功", "success");
        }
        this.onRestClose();
        this.triggerEvent("attendancechanged");
        await this.reloadAll();
      } catch (error) {
        this.showError(error, "操作失败");
      } finally {
        this.restSubmitting = false;
      }
    },

    onMakeupClose() {
      this.setData({ dialogShow: false });
    },

    async onMakeupSubmit() {
      if (this.data.makeupSubmitting) return;
      this.setData({ makeupSubmitting: true });
      try {
        await createMakeupRequest({
          date: this.data.makeupDate,
          type: this.data.makeupType,
          time: this.data.makeupTime,
        });
        this.showToast("补卡申请已提交", "success");
        this.setData({ dialogShow: false });
        this.triggerEvent("attendancechanged");
        await this.reloadAll();
      } catch (error) {
        this.showError(error, "提交失败");
      } finally {
        this.setData({ makeupSubmitting: false });
      }
    },

    onRefresherRefresh() {
      if (this.loading) return;
      this.beginRefresh();
      this.reloadAll().finally(() => {
        this.endRefresh();
        this.triggerEvent("attendancechanged");
      });
    },
  },
});
