const { toast, success, fail } = require("../../utils/toast");
const { request, getLocation } = require("../../utils/api");
const { getStoredAuth } = require("../../utils/auth");
const { reverseGeocode } = require("../../utils/amap");
const {
  monthKey,
  todayYmd,
  dayOfMonth,
  formatClock,
  formatDateLabel,
  formatHm,
  formatDayCount,
  isWithinEditWindow,
  buildEditWindowContext,
} = require("../../utils/time");
const {
  PUNCH_TYPES,
  PUNCH_LABEL,
  DEFAULT_MAKEUP_TIME,
  insideFence,
  isHalfRest,
  todayTypeMap,
  pickQuickPunchType,
  passesMakeupTodayGate,
  canEmployeeMakeup,
  halfHasPunch,
  slotTime,
} = require("../../utils/punch-logic");
const { wallpaperSrc, bindWallpaper } = require("../../utils/theme");

const SLOT_META = {
  morningIn: { type: "morning_in", half: "morning", kind: "in" },
  morningOut: { type: "morning_out", half: "morning", kind: "out" },
  afternoonIn: { type: "afternoon_in", half: "afternoon", kind: "in" },
  afternoonOut: { type: "afternoon_out", half: "afternoon", kind: "out" },
};

function hasOvertime(str) {
  return !!(str && str !== "0" && str !== "0分钟" && str !== "0小时");
}

/** 对齐网页：同一次小程序会话只自动定位一次 */
let didSessionAutoLocate = false;

Page({
  data: {
    wallpaperSrc: wallpaperSrc("light"),
    nowText: "00:00:00",
    todayLabel: "",
    locating: false,
    punching: false,
    locError: "",
    address: "",
    lat: 0,
    lng: 0,
    todaySteps: [],
    stats: [],
    monthRows: [],
    actionSheetShow: false,
    actionSheetActions: [],
    restDialogShow: false,
    restDialogTitle: "",
    restDialogMessage: "",
    makeupShow: false,
    makeupDate: "",
    makeupDateLabel: "",
    makeupType: "",
    makeupTypeLabel: "",
    makeupTime: "08:30",
    makeupSubmitting: false,
  },

  timer: null,
  unbindTheme: null,
  shift: null,
  fence: null,
  todayRecords: [],
  monthSummary: null,
  makeupRequests: [],
  restPending: null,
  rowMap: {},

  onLoad() {
    this.unbindTheme = bindWallpaper(this);
  },

  onShow() {
    const auth = getStoredAuth();
    if (!auth || !auth.accessToken || !auth.deviceToken) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    this.setData({ todayLabel: formatDateLabel() });
    this.tick();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 1000);
    this.bootstrap().catch(() => {});
  },

  async bootstrap() {
    await this.reloadAll();
    if (didSessionAutoLocate) return;
    didSessionAutoLocate = true;
    await this.onRefreshLocate();
  },

  onHide() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.unbindTheme) {
      this.unbindTheme();
      this.unbindTheme = null;
    }
  },

  tick() {
    this.setData({ nowText: formatClock() });
  },

  async reloadAll() {
    try {
      const month = monthKey();
      const [bundle, geofence, makeups] = await Promise.all([
        request("GET", `/attendance/bundle?month=${month}`),
        request("GET", "/attendance/geofence"),
        request("GET", "/attendance/makeup-requests/mine?status=pending").catch(
          () => [],
        ),
      ]);
      this.shift = bundle.shift || null;
      this.fence = geofence || null;
      this.todayRecords = Array.isArray(bundle.today) ? bundle.today : [];
      this.monthSummary = bundle.monthly || null;
      this.makeupRequests = Array.isArray(makeups) ? makeups : [];
      try {
        this.applyView();
      } catch (viewErr) {
        console.error("applyView failed", viewErr);
        fail("页面渲染失败");
      }
    } catch (err) {
      if (err.status === 401) return;
      fail(err.message || "加载失败");
    }
  },

  applyView() {
    const map = todayTypeMap(this.todayRecords);
    const todaySteps = PUNCH_TYPES.filter((t) => map[t]).map((t) => {
      const r = map[t];
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      const desc = r.address
        ? r.address
        : Number.isFinite(lat) && Number.isFinite(lng)
          ? `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          : "";
      return {
        type: t,
        time: formatHm(r.punchTime),
        text: PUNCH_LABEL[t],
        desc,
      };
    });

    const monthly = this.monthSummary || {};
    const stats = [
      {
        label: "出勤天数",
        value: formatDayCount(monthly.attendanceDays ?? 0),
        tone: "",
      },
      {
        label: "休息天数",
        value: formatDayCount(monthly.restDays ?? 0),
        tone: "",
      },
      {
        label: "缺卡",
        value: String(monthly.missingSlots ?? 0),
        tone: Number(monthly.missingSlots) > 0 ? "warn" : "",
      },
      {
        label: "加班",
        value: hasOvertime(monthly.overtimeStr) ? monthly.overtimeStr : "0",
        tone: hasOvertime(monthly.overtimeStr) ? "" : "muted",
      },
      {
        label: "剩余假期",
        value: formatDayCount(monthly.remainingLeave ?? 0),
        tone: "",
      },
    ];

    const gate = this.shift
      ? {
          morningInWindowEnd: this.shift.morningInWindowEnd,
          afternoonInWindowEnd: this.shift.afternoonInWindowEnd,
        }
      : null;
    const editCtx = buildEditWindowContext();
    const rowMap = {};
    const monthRows = (monthly.rows || []).map((row) => {
      rowMap[row.date] = row;
      return {
        date: row.date,
        day: dayOfMonth(row.date),
        morningIn: this.buildCell(row, "morningIn", gate, editCtx),
        morningOut: this.buildCell(row, "morningOut", gate, editCtx),
        afternoonIn: this.buildCell(row, "afternoonIn", gate, editCtx),
        afternoonOut: this.buildCell(row, "afternoonOut", gate, editCtx),
      };
    });
    this.rowMap = rowMap;

    this.setData({
      todaySteps,
      stats,
      monthRows,
    });
  },

  buildCell(row, slotKey, gate, editCtx) {
    const meta = SLOT_META[slotKey];
    const time = slotTime(row, meta.type);

    if (time) {
      return { text: time, tone: "plain", action: null };
    }

    if (meta.kind === "out" && isHalfRest(row.declaredRest, meta.half)) {
      return { text: "—", tone: "muted", action: null };
    }

    if (meta.kind === "in" && isHalfRest(row.declaredRest, meta.half)) {
      return {
        text: "休息",
        tone: "muted",
        action: { kind: "clearRest", half: meta.half },
      };
    }

    const pending = this.makeupRequests.some(
      (r) =>
        r.date === row.date && r.type === meta.type && r.status === "pending",
    );
    const inWindow = isWithinEditWindow(row.date, editCtx);
    const gateOk = passesMakeupTodayGate(row.date, meta.type, gate);
    const canMakeup =
      inWindow && gateOk && canEmployeeMakeup(row, meta.type) && !pending;

    const canRest =
      meta.kind === "in" &&
      inWindow &&
      !halfHasPunch(row, meta.half) &&
      !isHalfRest(row.declaredRest, meta.half);

    if (pending && !canRest) {
      return { text: "审批中", tone: "pending", action: null };
    }

    if (!canRest && !canMakeup && !pending) {
      return { text: "", tone: "muted", action: null };
    }

    const actions = [];
    if (canRest)
      actions.push({ name: "登记休息", kind: "declareRest", half: meta.half });
    if (canMakeup)
      actions.push({ name: "申请补卡", kind: "makeup", type: meta.type });

    let text = "";
    let tone = "cell";
    if (canRest && canMakeup) text = "休息/补卡";
    else if (canRest) text = "休息";
    else if (canMakeup) text = "补卡";

    return {
      text,
      tone,
      action: { kind: "sheet", actions },
    };
  },

  async onRefreshLocate() {
    if (this.data.locating || this.data.punching) return;
    this.setData({ locating: true, locError: "", punching: false });
    try {
      const loc = await getLocation();
      let address = "";
      let geoError = "";
      try {
        const geo = await reverseGeocode(loc.latitude, loc.longitude);
        address = (geo && geo.address) || "";
        geoError = (geo && geo.error) || "";
      } catch (_) {
        geoError = "地址解析失败";
      }
      this.setData({
        lat: loc.latitude,
        lng: loc.longitude,
        address:
          address || `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`,
        locating: false,
      });
      if (geoError) {
        toast(geoError);
      }
      await this.autoPunch(loc.latitude, loc.longitude, address);
    } catch (err) {
      if (err.status === 401) return;
      this.setData({
        locating: false,
        locError: err.message || "定位失败",
      });
      fail(err.message || "定位失败");
    }
  },

  async autoPunch(lat, lng, address) {
    if (!this.shift) {
      toast("班次未加载");
      return;
    }
    if (
      this.fence &&
      this.fence.enabled &&
      !insideFence(lat, lng, this.fence)
    ) {
      toast("不在打卡范围内");
      return;
    }
    const todayRow =
      (this.monthSummary &&
        (this.monthSummary.rows || []).find((r) => r.date === todayYmd())) ||
      null;
    const declaredRest = todayRow ? todayRow.declaredRest || null : null;
    const type = pickQuickPunchType({
      lat,
      lng,
      fence: this.fence || { enabled: false },
      shift: this.shift,
      map: todayTypeMap(this.todayRecords),
      declaredRest,
      at: new Date(),
    });
    if (!type) {
      toast("不在打卡时间内");
      return;
    }

    const auth = getStoredAuth();
    this.setData({ punching: true });
    try {
      await request("POST", "/attendance/punch", {
        type,
        latitude: lat,
        longitude: lng,
        address: address || "",
        deviceToken: auth.deviceToken,
      });
      success("打卡成功");
      await this.reloadAll();
    } catch (err) {
      if (err.status !== 401) fail(err.message || "打卡失败");
    } finally {
      this.setData({ punching: false });
    }
  },

  onCellTap(e) {
    const { date, slot } = e.currentTarget.dataset;
    const viewRow = (this.data.monthRows || []).find((r) => r.date === date);
    if (!viewRow) return;
    const cell = viewRow[slot];
    if (!cell || !cell.action) return;

    if (cell.action.kind === "clearRest") {
      this.openRestDialog(date, cell.action.half, "clear");
      return;
    }
    if (cell.action.kind === "sheet") {
      const actions = (cell.action.actions || []).map((a) => ({
        name: a.name,
        kind: a.kind,
        half: a.half,
        type: a.type,
        date,
      }));
      if (!actions.length) return;
      if (actions.length === 1) {
        this.handleAction(actions[0]);
        return;
      }
      this.setData({
        actionSheetShow: true,
        actionSheetActions: actions,
      });
    }
  },

  onActionClose() {
    this.setData({ actionSheetShow: false });
  },

  onActionSelect(e) {
    const action = e.detail;
    this.setData({ actionSheetShow: false });
    this.handleAction(action);
  },

  handleAction(action) {
    if (!action) return;
    if (action.kind === "declareRest") {
      this.openRestDialog(action.date, action.half, "declare");
      return;
    }
    if (action.kind === "makeup") {
      this.openMakeup(action.date, action.type);
    }
  },

  openRestDialog(date, half, mode) {
    const row = this.rowMap[date];
    const halfLabel = half === "morning" ? "上午" : "下午";
    const dayLabel = `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`;
    const message =
      mode === "clear"
        ? `确认取消 ${dayLabel} ${halfLabel}休息登记？`
        : (half === "morning" &&
              row &&
              row.declaredRest === "afternoon_rest") ||
            (half === "afternoon" && row && row.declaredRest === "morning_rest")
          ? `确认将 ${dayLabel} 登记为全天休息？`
          : `确认将 ${dayLabel} ${halfLabel}登记为休息？`;
    this.restPending = { date, half, mode };
    this.setData({
      restDialogShow: true,
      restDialogTitle: mode === "clear" ? "取消休息" : "登记休息",
      restDialogMessage: message,
    });
  },

  onRestClose() {
    this.setData({ restDialogShow: false });
    this.restPending = null;
  },

  async onRestConfirm() {
    const pending = this.restPending;
    if (!pending) return;
    try {
      if (pending.mode === "declare") {
        await request("POST", "/attendance/rest", {
          date: pending.date,
          half: pending.half,
        });
        success("休息登记成功");
      } else {
        await request("POST", "/attendance/rest/clear", {
          date: pending.date,
          half: pending.half,
        });
        success("已取消休息登记");
      }
      this.setData({ restDialogShow: false });
      this.restPending = null;
      await this.reloadAll();
    } catch (err) {
      if (err.status !== 401) fail(err.message || "操作失败");
    }
  },

  openMakeup(date, type) {
    this.setData({
      makeupShow: true,
      makeupDate: date,
      makeupDateLabel: `${date.slice(0, 4)}年${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`,
      makeupType: type,
      makeupTypeLabel: PUNCH_LABEL[type] || type,
      makeupTime: DEFAULT_MAKEUP_TIME[type] || "08:30",
    });
  },

  onMakeupClose() {
    this.setData({ makeupShow: false });
  },

  onMakeupTimeChange(e) {
    this.setData({ makeupTime: e.detail.value });
  },

  async onMakeupSubmit() {
    if (this.data.makeupSubmitting) return;
    this.setData({ makeupSubmitting: true });
    try {
      await request("POST", "/attendance/makeup-requests", {
        date: this.data.makeupDate,
        type: this.data.makeupType,
        time: this.data.makeupTime,
      });
      success("补卡申请已提交");
      this.setData({ makeupShow: false, makeupSubmitting: false });
      await this.reloadAll();
    } catch (err) {
      if (err.status !== 401) fail(err.message || "提交失败");
      this.setData({ makeupSubmitting: false });
    }
  },
});
