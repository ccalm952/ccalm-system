const {
  clearRest,
  createMakeupRequest,
  declareRest,
  directMakeup,
  getMissingHistory,
  getMonthlySummaries,
  getMonthlySummary,
  getShift,
  listMakeupRequests,
  listMyMakeupRequests,
} = require("../../../services/attendance");
const {
  getSession,
  isAdmin,
  requireSession,
} = require("../../../store/session");
const toastBehavior = require("../../../behaviors/toast");
const pullRefreshBehavior = require("../../../behaviors/pull-refresh");
const makeupTimeBehavior = require("../../../behaviors/makeup-time");
const {
  buildAttendanceRow,
  dateDisplay,
  restConfirmMessage,
} = require("../../../utils/attendance-table");
const {
  DEFAULT_MAKEUP_TIME,
  PUNCH_LABEL,
} = require("../../../utils/punch-rule");
const {
  formatDayCount,
  formatMonthTitle,
  formatOvertimeHours,
  monthKey,
  setEditStartMonth,
  shiftMonthKey,
} = require("../../../utils/time");

Component({
  behaviors: [toastBehavior, pullRefreshBehavior, makeupTimeBehavior],

  properties: {
    active: { type: Boolean, value: false },
  },

  data: {
    thisMonth: monthKey(),
    month: monthKey(),
    monthTitle: formatMonthTitle(monthKey()),
    canNext: false,
    users: [],
    pageLoading: false,
    expandedId: "",
    dialogShow: false,
    restDialogShow: false,
    restDialogTitle: "",
    restDialogMessage: "",
    makeupDialogTitle: "补卡",
    makeupUserId: "",
    makeupDate: "",
    makeupDateLabel: "",
    makeupType: "",
    makeupTypeLabel: "",
    makeupSubmitting: false,
    makeupDirect: false,
    shellStyle: "",
    makeupDialogLift: "",
  },

  observers: {
    active(value) {
      if (value) this.activate();
      else this.clearToast();
    },
  },

  lifetimes: {
    attached() {
      this.pendingRequests = [];
      if (this.properties.active) this.activate();
    },
  },

  methods: {
    refresh() {
      if (!this.properties.active || !this.statsLoaded) return;
      this.load(false);
    },

    activate() {
      const session = requireSession();
      if (!session) return;
      this.setData({ makeupDirect: isAdmin(session) });
      if (this.statsLoaded) {
        this.setData({ pageLoading: false });
        return;
      }
      this.load(true);
    },

    async load(showLoading) {
      if (this.loading) return;
      this.loading = true;
      if (showLoading) this.setData({ pageLoading: true });
      try {
        await this.reload();
      } finally {
        this.loading = false;
        this.setData({ pageLoading: false });
      }
    },

    requestsFor(userId) {
      return (this.pendingRequests || []).filter(
        (item) => item.userId === userId,
      );
    },

    toMonthlyRow(row) {
      return {
        date: row.date,
        morningIn: row.morningIn,
        morningOut: row.morningOut,
        afternoonIn: row.afternoonIn,
        afternoonOut: row.afternoonOut,
        declaredRest: row.declaredRest,
      };
    },

    mapDetails(rows, userId) {
      const requests = this.requestsFor(userId);
      const at = new Date();
      return (rows || []).map((row) => {
        const source = this.toMonthlyRow(row);
        const built = buildAttendanceRow(source, this.shift, requests, at);
        return {
          key: row.date,
          day: built.day,
          slots: built.slots,
          source,
        };
      });
    },

    showOvertime(value) {
      return formatOvertimeHours(value);
    },

    mapSummary(item, loaded) {
      const missing = Number(item.allMissingSlots);
      return {
        userId: item.userId,
        userName: item.userName,
        attendance: formatDayCount(item.attendanceDays),
        rest: formatDayCount(item.restDays),
        missing: String(missing),
        missingDanger: missing > 0,
        overtime: this.showOvertime(item.overtimeStr),
        expanded: false,
        details: loaded ? this.mapDetails(item.rows, item.userId) : [],
        detailLoaded: loaded,
      };
    },

    findUser(userId) {
      return (
        (this.data.users || []).find((item) => item.userId === userId) || null
      );
    },

    setExpanded(userId, open, details, loaded) {
      const users = (this.data.users || []).map((item) => {
        if (item.userId === userId) {
          const next = Object.assign({}, item, { expanded: open });
          if (details) {
            next.details = details;
            next.detailLoaded = loaded;
          }
          return next;
        }
        if (open && item.expanded) {
          return Object.assign({}, item, { expanded: false });
        }
        return item;
      });
      this.setData({ users });
    },

    applyMonthSummary(userId, detail) {
      const missing = Number(detail.allMissingSlots);
      const users = (this.data.users || []).map((item) => {
        if (item.userId !== userId) return item;
        return Object.assign({}, item, {
          attendance: formatDayCount(detail.attendanceDays),
          rest: formatDayCount(detail.restDays),
          missing: String(missing),
          missingDanger: missing > 0,
          overtime: this.showOvertime(detail.overtimeStr),
        });
      });
      this.setData({ users });
    },

    async reload() {
      const session = getSession();
      if (!session || !session.user) return;
      const month = this.data.month;
      const keep = this.data.expandedId;
      const admin = isAdmin(session);
      try {
        const requestsPromise = admin
          ? listMakeupRequests("pending").catch(() => [])
          : listMyMakeupRequests("pending").catch(() => []);
        const [shiftValue, requests, history] = await Promise.all([
          getShift(),
          requestsPromise,
          getMissingHistory().catch(() => null),
        ]);
        this.shift = shiftValue;
        this.pendingRequests = Array.isArray(requests) ? requests : [];
        setEditStartMonth(
          history && history.startDate
            ? String(history.startDate).slice(0, 7)
            : "",
        );
        let lines = [];
        if (admin) {
          const list = await getMonthlySummaries(month);
          lines = (list || []).map((item) => this.mapSummary(item, false));
        } else {
          const summary = await getMonthlySummary(month);
          const user = session.user;
          const name = user.displayName || user.username || "";
          lines = [
            this.mapSummary(
              {
                userId: user.id,
                userName: name,
                attendanceDays: summary.attendanceDays,
                restDays: summary.restDays,
                allMissingSlots: summary.allMissingSlots,
                overtimeStr: summary.overtimeStr,
                rows: summary.rows,
              },
              true,
            ),
          ];
        }
        lines = lines.map((line) =>
          Object.assign({}, line, { expanded: line.userId === keep }),
        );
        this.statsLoaded = true;
        this.setData({ users: lines, expandedId: keep });
        if (keep) {
          const current = this.findUser(keep);
          if (current && !current.detailLoaded) {
            await this.openUser(keep);
          }
        }
      } catch (error) {
        this.showError(error, "统计加载失败");
      }
    },

    goPrevMonth() {
      this.onMonth(shiftMonthKey(this.data.month, -1));
    },

    goNextMonth() {
      if (!this.data.canNext) return;
      this.onMonth(shiftMonthKey(this.data.month, 1));
    },

    onMonth(value) {
      if (!value || this.data.month === value) return;
      this.setData({
        month: value,
        monthTitle: formatMonthTitle(value),
        canNext: value < this.data.thisMonth,
        expandedId: "",
      });
      this.load(true);
    },

    async refreshUser(userId) {
      const detail = await getMonthlySummary(
        this.data.month,
        this.targetUserId(userId) || undefined,
      );
      const details = this.mapDetails(detail.rows, userId);
      const missing = Number(detail.allMissingSlots);
      const users = (this.data.users || []).map((item) => {
        if (item.userId !== userId) return item;
        return Object.assign({}, item, {
          attendance: formatDayCount(detail.attendanceDays),
          rest: formatDayCount(detail.restDays),
          missing: String(missing),
          missingDanger: missing > 0,
          overtime: this.showOvertime(detail.overtimeStr),
          details,
          detailLoaded: true,
          expanded: true,
        });
      });
      this.setData({ users, expandedId: userId });
    },

    async openUser(userId) {
      const current = this.findUser(userId);
      if (!current) {
        this.setData({ expandedId: "" });
        return;
      }
      const detail = await getMonthlySummary(
        this.data.month,
        this.targetUserId(userId) || undefined,
      );
      const details = this.mapDetails(detail.rows, userId);
      this.applyMonthSummary(userId, detail);
      this.setData({ expandedId: userId });
      this.setExpanded(userId, true, details, true);
    },

    async onToggle(event) {
      const userId = String(
        (event.currentTarget.dataset && event.currentTarget.dataset.user) || "",
      );
      if (!userId) return;
      const current = this.findUser(userId);
      if (!current) return;
      if (current.expanded) {
        this.setData({ expandedId: "" });
        this.setExpanded(userId, false, [], false);
        return;
      }
      try {
        await this.openUser(userId);
      } catch (error) {
        this.showError(error, "明细加载失败");
      }
    },

    findSource(userId, date) {
      const user = this.findUser(userId);
      if (!user) return null;
      const line = (user.details || []).find((item) => item.key === date);
      return line ? line.source : null;
    },

    targetUserId(userId) {
      const session = getSession();
      if (!session || !session.user) return null;
      if (!isAdmin(session) || session.user.id === userId) return null;
      return userId;
    },

    onCellAction(event) {
      const data = event.currentTarget.dataset || {};
      const userId = String(data.user || "");
      const date = String(data.date || "");
      const kind = String(data.kind || "");
      const half = data.half && data.half !== "null" ? String(data.half) : null;
      const type = data.type && data.type !== "null" ? String(data.type) : null;
      if (kind === "makeup" && type) {
        this.resetTimeEntry();
        this.setData({
          dialogShow: true,
          restDialogShow: false,
          makeupUserId: userId,
          makeupDate: date,
          makeupDateLabel: dateDisplay(date),
          makeupType: type,
          makeupTypeLabel: PUNCH_LABEL[type] || type,
          makeupTime: DEFAULT_MAKEUP_TIME[type] || "08:30",
          shellStyle: "",
          makeupDialogLift: "",
        });
        this.syncTimeDisplay();
        return;
      }
      if (!half) return;
      const row = this.findSource(userId, date);
      if (!row) return;
      const clearing = kind === "clearRest";
      this.restPending = {
        userId,
        date,
        half,
        clearing,
      };
      this.setData({
        dialogShow: true,
        restDialogShow: true,
        restDialogTitle: clearing ? "取消休息" : "登记休息",
        restDialogMessage: restConfirmMessage(row, half, clearing),
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
      this.setData({
        restDialogShow: false,
        dialogShow: false,
        shellStyle: "",
        makeupDialogLift: "",
      });
      this.restPending = null;
    },

    async onRestConfirm() {
      const pending = this.restPending;
      if (!pending || this.restSubmitting) return;
      this.restSubmitting = true;
      try {
        const body = { date: pending.date, half: pending.half };
        const target = this.targetUserId(pending.userId);
        if (target) body.userId = target;
        if (pending.clearing) {
          await clearRest(body);
          this.showToast("已取消休息登记", "success");
        } else {
          await declareRest(body);
          this.showToast("休息登记成功", "success");
        }
        this.onRestClose();
        this.triggerEvent("attendancechanged");
        await this.refreshUser(pending.userId);
      } catch (error) {
        this.showError(error, "操作失败");
      } finally {
        this.restSubmitting = false;
      }
    },

    onMakeupClose() {
      this.setData({
        dialogShow: false,
        shellStyle: "",
        makeupDialogLift: "",
      });
      this.resetTimeEntry();
    },

    async onMakeupSubmit() {
      if (this.data.makeupSubmitting) return;
      if (this.data.makeupDirect && !this.isClockTime(this.data.makeupTime)) {
        return;
      }
      this.setData({ makeupSubmitting: true });
      try {
        if (this.data.makeupDirect) {
          await directMakeup({
            userId: this.data.makeupUserId,
            date: this.data.makeupDate,
            type: this.data.makeupType,
            time: this.data.makeupTime,
          });
          this.showToast("补卡成功", "success");
        } else {
          await createMakeupRequest({
            date: this.data.makeupDate,
            type: this.data.makeupType,
            time: this.data.makeupTime,
          });
          this.showToast("补卡申请已提交", "success");
        }
        this.setData({
          dialogShow: false,
          shellStyle: "",
          makeupDialogLift: "",
        });
        this.resetTimeEntry();
        this.triggerEvent("attendancechanged");
        await this.refreshUser(this.data.makeupUserId);
      } catch (error) {
        this.showError(error, "提交失败");
      } finally {
        this.setData({ makeupSubmitting: false });
      }
    },

    onMakeupKeyboardHeight(event) {
      const height = Number((event.detail && event.detail.height) || 0);
      this.setData({
        shellStyle: height > 0 ? "justify-content: flex-end;" : "",
        makeupDialogLift: height > 0 ? `margin-bottom: ${height}px;` : "",
      });
    },

    onRefresherRefresh() {
      if (this.loading) return;
      this.beginRefresh();
      this.load(false).finally(() => {
        this.endRefresh();
        this.triggerEvent("attendancechanged");
      });
    },
  },
});
