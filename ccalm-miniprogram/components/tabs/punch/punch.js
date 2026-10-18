const {
  getAttendanceBundle,
  getGeofence,
  getSchedule,
  listMyMakeupRequests,
  submitPunch,
  declareRest,
  clearRest,
  createMakeupRequest,
} = require("../../../services/attendance");
const { getLocation } = require("../../../services/wechat");
const { reverseGeocode } = require("../../../services/amap");
const {
  getSession,
  redirectToLogin,
  requireSession,
} = require("../../../store/session");
const toastBehavior = require("../../../behaviors/toast");
const pullRefreshBehavior = require("../../../behaviors/pull-refresh");
const {
  PUNCH_TYPES,
  PUNCH_LABEL,
  DEFAULT_MAKEUP_TIME,
  insideFence,
  todayTypeMap,
  pickQuickPunchType,
} = require("../../../utils/punch-rule");
const {
  buildAttendanceRow,
  dateDisplay,
  restConfirmMessage,
} = require("../../../utils/attendance-table");
const {
  monthKey,
  todayYmd,
  formatClock,
  formatDateLabel,
  formatHm,
  formatDayCount,
  formatOvertimeHours,
} = require("../../../utils/time");

function hasOvertime(value) {
  return !!value && value !== "0" && value !== "0分钟" && value !== "0小时";
}

function buildScheduleStats(schedule, userId) {
  const user = ((schedule && schedule.users) || []).find(
    (item) => item.userId === userId,
  );
  if (!user) return [];
  return [
    { label: "本月假期", value: formatDayCount(schedule.monthAllowance) },
    { label: "本月请假", value: formatDayCount(user.monthLeave) },
    { label: "假期抵消", value: formatDayCount(user.leaveOffsetDays) },
    { label: "剩余假期", value: formatDayCount(user.remainingLeave) },
  ];
}

Component({
  behaviors: [toastBehavior, pullRefreshBehavior],

  properties: {
    active: { type: Boolean, value: false },
  },

  data: {
    nowText: "00:00",
    todayLabel: "",
    locating: false,
    punching: false,
    locError: "",
    address: "",
    latitude: null,
    longitude: null,
    todaySteps: [],
    overtimeText: "0.0h",
    overtimeMuted: true,
    leaveText: "0",
    todayRows: [],
    scheduleStats: [],
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
      if (this.properties.active) this.activate();
    },

    activate() {
      if (!requireSession()) return;
      if (this.loading) return;
      this.loading = true;
      if (!this.loaded) this.setData({ pageLoading: true });
      this.setData({ todayLabel: formatDateLabel() });
      this.tick();
      this.startTimer();
      this.reloadAll()
        .then((ok) => {
          this.setData({ pageLoading: false });
          if (ok) {
            this.loaded = true;
            if (!this.didAutoLocate && this.properties.active) {
              this.didAutoLocate = true;
              this.onRefreshLocate();
            }
          }
        })
        .finally(() => {
          this.loading = false;
          this.setData({ pageLoading: false });
        });
    },

    deactivate() {
      this.clearToast();
      this.stopTimer();
    },

    startTimer() {
      this.stopTimer();
      this.timer = setInterval(() => this.tick(), 60000);
    },

    stopTimer() {
      if (!this.timer) return;
      clearInterval(this.timer);
      this.timer = null;
    },

    tick() {
      this.setData({ nowText: formatClock() });
    },

    async reloadAll() {
      try {
        const month = monthKey();
        const session = getSession();
        const [bundle, fence, makeups, schedule] = await Promise.all([
          getAttendanceBundle(month),
          getGeofence(),
          listMyMakeupRequests("pending").catch(() => []),
          getSchedule(month).catch(() => null),
        ]);
        this.shift = bundle.shift || null;
        this.fence = fence || null;
        this.todayRecords = Array.isArray(bundle.today) ? bundle.today : [];
        this.allMonthRows = (bundle.monthly && bundle.monthly.rows) || [];
        this.makeupRequests = Array.isArray(makeups) ? makeups : [];
        this.scheduleStats = buildScheduleStats(
          schedule,
          session && session.user && session.user.id,
        );
        this.applyView(bundle.monthly || {});
        return true;
      } catch (error) {
        this.showError(error, "加载失败");
        return false;
      }
    },

    applyView(monthly) {
      const map = todayTypeMap(this.todayRecords);
      const steps = PUNCH_TYPES.filter((type) => map[type]).map((type) => {
        const record = map[type];
        const lat = Number(record.latitude);
        const lng = Number(record.longitude);
        let desc = record.address || "";
        if (!desc && Number.isFinite(lat) && Number.isFinite(lng)) {
          desc = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
        return {
          type,
          time: formatHm(record.punchTime),
          text: PUNCH_LABEL[type],
          desc,
        };
      });
      const overtime = hasOvertime(monthly.overtimeStr);
      const today = todayYmd();
      const rows = this.allMonthRows
        .filter((row) => row.date === today)
        .map((row) =>
          buildAttendanceRow(row, this.shift, this.makeupRequests, new Date()),
        );
      this.setData({
        todaySteps: steps,
        overtimeText: overtime
          ? formatOvertimeHours(monthly.overtimeStr)
          : "0.0h",
        overtimeMuted: !overtime,
        leaveText: formatDayCount(monthly.remainingLeave),
        todayRows: rows,
        scheduleStats: this.scheduleStats || [],
      });
    },

    async onRefreshLocate() {
      if (this.data.locating || this.data.punching) return;
      this.setData({ locating: true, locError: "" });
      try {
        const point = await getLocation();
        let geocode = { address: "", error: "" };
        try {
          geocode = await reverseGeocode(point.latitude, point.longitude);
        } catch (_) {
          geocode = { address: "", error: "地址解析失败" };
        }
        const address =
          (geocode.address && geocode.address.length > 0
            ? geocode.address
            : "") ||
          `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
        this.setData({
          latitude: point.latitude,
          longitude: point.longitude,
          address,
          locating: false,
        });
        if (geocode.error) this.showToast(geocode.error, "error");
        if (!this.properties.active) return;
        await this.autoPunch(
          point.latitude,
          point.longitude,
          geocode.address || "",
        );
      } catch (error) {
        this.setData({
          locating: false,
          locError: (error && error.message) || "定位失败",
        });
        this.showError(error, "定位失败");
      }
    },

    async autoPunch(latitude, longitude, address) {
      if (!this.properties.active) return;
      if (!this.shift) {
        this.showToast("班次未加载", "error");
        return;
      }
      if (!insideFence(latitude, longitude, this.fence)) {
        this.showToast("不在打卡范围内", "error");
        return;
      }
      const today = todayYmd();
      const row = this.allMonthRows.find((item) => item.date === today) || null;
      const type = pickQuickPunchType({
        lat: latitude,
        lng: longitude,
        fence: this.fence || { enabled: false },
        shift: this.shift,
        map: todayTypeMap(this.todayRecords),
        declaredRest: row ? row.declaredRest : null,
        at: new Date(),
      });
      if (!type) {
        this.showToast("不在打卡时间内", "error");
        return;
      }
      const session = getSession();
      if (!session) {
        redirectToLogin();
        return;
      }
      this.setData({ punching: true });
      try {
        await submitPunch({
          type,
          latitude,
          longitude,
          address: address || "",
          deviceToken: session.deviceToken,
        });
        this.showToast("打卡成功", "success");
        this.triggerEvent("attendancechanged");
        await this.reloadAll();
      } catch (error) {
        this.showError(error, "打卡失败");
      } finally {
        this.setData({ punching: false });
      }
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
        this.allMonthRows.find((item) => item.date === action.date) || null;
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
      this.beginRefresh();
      this.reloadAll()
        .then((ok) => {
          if (ok) return this.onRefreshLocate();
          return undefined;
        })
        .finally(() => this.endRefresh());
    },
  },
});
