const {
  getAttendanceBundle,
  getGeofence,
  getSchedule,
  submitPunch,
} = require("../../../services/attendance");
const { getLocation } = require("../../../services/wechat");
const { reverseGeocode } = require("../../../services/amap");
const {
  clearSession,
  getSession,
  redirectToLogin,
  requireSession,
} = require("../../../store/session");
const { LOGIN_PAGE } = require("../../../constants/routes");
const toastBehavior = require("../../../behaviors/toast");
const pullRefreshBehavior = require("../../../behaviors/pull-refresh");
const {
  PUNCH_TYPES,
  PUNCH_LABEL,
  insideFence,
  todayTypeMap,
  pickQuickPunchType,
} = require("../../../utils/punch-rule");
const {
  monthKey,
  todayYmd,
  formatDateShort,
  formatHm,
  formatDayCount,
  formatOvertimeHours,
} = require("../../../utils/time");

function buildScheduleStats(schedule, userId, monthly) {
  const user = ((schedule && schedule.users) || []).find(
    (item) => item.userId === userId,
  );
  if (!user) return [];
  return [
    { label: "本月假期", value: formatDayCount(schedule.monthAllowance) },
    { label: "本月请假", value: formatDayCount(user.monthLeave) },
    { label: "剩余假期", value: formatDayCount(user.remainingLeave) },
    {
      label: "加班时长",
      value: formatOvertimeHours(monthly && monthly.overtimeStr) || "0.0h",
    },
  ];
}

Component({
  behaviors: [toastBehavior, pullRefreshBehavior],

  properties: {
    active: { type: Boolean, value: false },
    reviewBadge: { type: String, value: "" },
  },

  data: {
    todayLabel: "",
    locating: false,
    punching: false,
    locError: "",
    address: "",
    latitude: null,
    longitude: null,
    todaySteps: [],
    scheduleStats: [],
    pageLoading: false,
    todoShow: false,
    logoutShow: false,
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
      this.setData({ todayLabel: formatDateShort() });
      this.loading = true;
      this.reloadAll().finally(() => {
        this.loading = false;
      });
    },

    activate() {
      if (!requireSession()) return;
      if (this.loading) return;
      this.setData({ todayLabel: formatDateShort() });
      if (this.loaded) return;
      this.loading = true;
      this.setData({ pageLoading: true });
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
    },

    async reloadAll() {
      try {
        const month = monthKey();
        const session = getSession();
        const [bundle, fence, schedule] = await Promise.all([
          getAttendanceBundle(month),
          getGeofence(),
          getSchedule(month).catch(() => null),
        ]);
        this.shift = bundle.shift || null;
        this.fence = fence || null;
        this.todayRecords = Array.isArray(bundle.today) ? bundle.today : [];
        this.allMonthRows = (bundle.monthly && bundle.monthly.rows) || [];
        this.scheduleStats = buildScheduleStats(
          schedule,
          session && session.user && session.user.id,
          bundle.monthly,
        );
        this.applyView();
        return true;
      } catch (error) {
        this.showError(error, "加载失败");
        return false;
      }
    },

    applyView() {
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
      this.setData({
        todaySteps: steps,
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

    onTodoOpen() {
      this.setData({ todoShow: true });
    },

    onTodoClose() {
      this.setData({ todoShow: false });
    },

    onTodoChanged() {
      this.triggerEvent("attendancechanged");
    },

    onLogoutOpen() {
      this.setData({ logoutShow: true });
    },

    onLogoutCancel() {
      this.setData({ logoutShow: false });
    },

    onLogoutConfirm() {
      this.setData({ logoutShow: false });
      clearSession();
      wx.reLaunch({ url: LOGIN_PAGE });
    },

    onRefresherRefresh() {
      if (this.loading) return;
      this.beginRefresh();
      this.reloadAll()
        .then((ok) => {
          if (ok) return this.onRefreshLocate();
          return undefined;
        })
        .finally(() => {
          this.endRefresh();
          this.triggerEvent("attendancechanged");
        });
    },
  },
});
