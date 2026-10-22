const {
  getHolidays,
  getMonthlySummary,
  getSchedule,
} = require("../../../services/attendance");
const { getSession, requireSession } = require("../../../store/session");
const toastBehavior = require("../../../behaviors/toast");
const pullRefreshBehavior = require("../../../behaviors/pull-refresh");
const {
  formatMonthTitle,
  formatOvertimeHours,
  monthKey,
  pad2,
  shiftMonthKey,
  todayYmd,
} = require("../../../utils/time");

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function scheduleMonthRange() {
  const year = Number(monthKey().slice(0, 4));
  return {
    min: `${year - 1}-01`,
    max: `${year}-12`,
  };
}

function isScheduleMonth(month) {
  const range = scheduleMonthRange();
  return month >= range.min && month <= range.max;
}

const INITIAL_MONTH = monthKey();
const INITIAL_RANGE = scheduleMonthRange();

function shiftLabel(value) {
  if (value === "full_rest") return "全";
  if (value === "morning_rest") return "上";
  if (value === "afternoon_rest") return "下";
  return "";
}

function dayOvertimeText(value) {
  const text = String(value || "").trim();
  if (
    text.length === 0 ||
    text === "-" ||
    text === "0" ||
    text === "0分钟" ||
    text === "0小时"
  ) {
    return "";
  }
  const hours = formatOvertimeHours(text);
  if (!hours || hours === "0.0h") return "";
  return hours;
}

function overtimeByDate(rows) {
  const result = {};
  (rows || []).forEach((row) => {
    const text = dayOvertimeText(row.overtimeStr);
    if (text) result[row.date] = text;
  });
  return result;
}

function findScheduleUser(users, userId) {
  return (users || []).find((item) => item.userId === userId) || null;
}

Component({
  behaviors: [toastBehavior, pullRefreshBehavior],

  properties: {
    active: { type: Boolean, value: false },
  },

  data: {
    weekdays: WEEKDAYS,
    selectedMonth: INITIAL_MONTH,
    monthTitle: formatMonthTitle(INITIAL_MONTH),
    canPrev: INITIAL_MONTH > INITIAL_RANGE.min,
    canNext: INITIAL_MONTH < INITIAL_RANGE.max,
    weeks: [],
    empty: false,
    pageLoading: false,
  },

  observers: {
    active(value) {
      if (value) this.activate();
      else this.clearToast();
    },
  },

  lifetimes: {
    attached() {
      this.monthCache = new Map();
      this.holidayCache = new Map();
      this.prefetching = new Map();
      if (this.properties.active) this.activate();
    },
  },

  methods: {
    refresh() {
      if (!this.properties.active || this.loading) return;
      const session = requireSession();
      if (!session) return;
      this.userId = (session.user && session.user.id) || this.userId;
      if (!this.scheduleShown) {
        this.activate();
        return;
      }
      this.loading = true;
      this.reloadAll(true).finally(() => {
        this.loading = false;
        this.setData({ pageLoading: false });
      });
    },

    activate() {
      const session = requireSession();
      if (!session) return;
      this.userId = (session.user && session.user.id) || this.userId;
      if (this.loading) return;
      const cached = this.monthCache.get(this.data.selectedMonth);
      if (cached) {
        if (this.scheduleShown) return;
        this.applyCache(cached);
        this.prefetchNeighbors(this.data.selectedMonth);
        return;
      }
      this.loading = true;
      this.setData({ pageLoading: this.data.weeks.length === 0 });
      this.reloadAll(true).finally(() => {
        this.loading = false;
        this.setData({ pageLoading: false });
      });
    },

    applyCache(cache) {
      this.scheduleShown = true;
      this.setData({
        weeks: cache.weeks,
        empty: cache.empty,
        pageLoading: false,
      });
    },

    applyMonth(month) {
      const range = scheduleMonthRange();
      const title = formatMonthTitle(month);
      this.setData({
        selectedMonth: month,
        monthTitle: title,
        canPrev: month > range.min,
        canNext: month < range.max,
      });
    },

    async loadHolidays(year) {
      const cached = this.holidayCache.get(year);
      if (cached) return cached;
      try {
        const holidays = await getHolidays(year);
        this.holidayCache.set(year, holidays);
        return holidays;
      } catch (_) {
        return { offDayMap: {} };
      }
    },

    async fetchMonthCache(month, userId) {
      if (!isScheduleMonth(month)) return null;
      try {
        const year = month.slice(0, 4);
        const schedulePromise = getSchedule(month);
        const holidaysPromise = this.loadHolidays(year);
        const summaryPromise = getMonthlySummary(month);
        const schedule = await schedulePromise;
        const holidays = await holidaysPromise;
        let overtimeMap = {};
        try {
          const summary = await summaryPromise;
          overtimeMap = overtimeByDate(summary.rows);
        } catch (_) {
          overtimeMap = {};
        }
        const users = (schedule && schedule.users) || [];
        const mine = findScheduleUser(users, userId);
        const cells = [];
        const todayKey = todayYmd();
        const headers = (schedule && schedule.dayHeaders) || [];
        const first = headers.length > 0 ? headers[0] : null;
        const offset = first ? WEEKDAYS.indexOf(first.weekday) : 0;
        for (let index = 0; index < offset; index += 1) {
          cells.push({
            key: `blank-${index}`,
            blank: true,
            day: 0,
            holiday: false,
            today: false,
            label: "",
            tone: "",
            overtime: "",
            hasEvents: false,
          });
        }
        headers.forEach((header) => {
          const raw = mine ? mine.days && mine.days[String(header.day)] : null;
          const shift = raw == null ? null : String(raw);
          const dateKey = `${month}-${pad2(header.day)}`;
          const overtime = overtimeMap[dateKey] || "";
          const label = shiftLabel(shift);
          const offDays = (holidays && holidays.offDayMap) || {};
          cells.push({
            key: String(header.day),
            blank: false,
            day: header.day,
            holiday: !!offDays[dateKey],
            today: dateKey === todayKey,
            label,
            tone: shift || "",
            overtime,
            hasEvents: label.length > 0 || overtime.length > 0,
          });
        });
        while (cells.length % 7 !== 0) {
          cells.push({
            key: `tail-${cells.length}`,
            blank: true,
            day: 0,
            holiday: false,
            today: false,
            label: "",
            tone: "",
            overtime: "",
            hasEvents: false,
          });
        }
        const weeks = [];
        const weekCount = Math.floor(cells.length / 7);
        for (let index = 0; index < cells.length; index += 7) {
          const weekIndex = Math.floor(index / 7);
          weeks.push({
            key: `week-${index}`,
            cells: cells.slice(index, index + 7),
            divider: weekIndex < weekCount - 1,
          });
        }
        const cache = {
          weeks,
          empty: mine == null,
        };
        this.monthCache.set(month, cache);
        return cache;
      } catch (error) {
        this.showError(error, "排班加载失败");
        return null;
      }
    },

    prefetchNeighbors(month) {
      const session = getSession();
      if (!session || !session.user) return;
      const userId = session.user.id;
      [shiftMonthKey(month, -1), shiftMonthKey(month, 1)].forEach((target) => {
        if (!isScheduleMonth(target)) return;
        if (this.monthCache.get(target)) return;
        if (this.prefetching.get(target) === true) return;
        this.prefetching.set(target, true);
        this.fetchMonthCache(target, userId).finally(() => {
          this.prefetching.set(target, false);
        });
      });
    },

    async reloadAll(force) {
      const session = getSession();
      if (!session || !session.user) return false;
      const month = this.data.selectedMonth;
      if (!force) {
        const cached = this.monthCache.get(month);
        if (cached) {
          this.applyCache(cached);
          this.prefetchNeighbors(month);
          return true;
        }
      }
      const cache = await this.fetchMonthCache(month, session.user.id);
      if (!cache) return false;
      if (this.data.selectedMonth !== month) return true;
      this.applyCache(cache);
      this.prefetchNeighbors(month);
      return true;
    },

    switchMonth(delta) {
      if (this.switching) return;
      const month = shiftMonthKey(this.data.selectedMonth, delta);
      if (!isScheduleMonth(month)) return;
      this.applyMonth(month);
      const cached = this.monthCache.get(month);
      if (cached) {
        this.applyCache(cached);
        this.prefetchNeighbors(month);
        return;
      }
      this.switching = true;
      this.setData({ pageLoading: true });
      this.reloadAll(true).finally(() => {
        this.switching = false;
        this.setData({ pageLoading: false });
      });
    },

    goPrevMonth() {
      this.switchMonth(-1);
    },

    goNextMonth() {
      this.switchMonth(1);
    },

    onRefresherRefresh() {
      if (this.loading) return;
      this.beginRefresh();
      this.monthCache.delete(this.data.selectedMonth);
      this.reloadAll(true).finally(() => {
        this.endRefresh();
        this.triggerEvent("attendancechanged");
      });
    },
  },
});
