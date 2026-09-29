const { request, getLocation } = require("../../utils/api")
const { getStoredAuth, clearStoredAuth } = require("../../utils/auth")

const PUNCH_TYPES = [
  { type: "morning_in", label: "上午上班" },
  { type: "morning_out", label: "上午下班" },
  { type: "afternoon_in", label: "下午上班" },
  { type: "afternoon_out", label: "下午下班" },
]

function pad(n) {
  return n < 10 ? `0${n}` : String(n)
}

function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "--:--"
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

function todayLabel(d = new Date()) {
  const week = ["日", "一", "二", "三", "四", "五", "六"]
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${week[d.getDay()]}`
}

Page({
  data: {
    displayName: "",
    todayLabel: "",
    nowText: "00:00:00",
    records: [],
    punchButtons: PUNCH_TYPES.map((item) => ({ ...item, done: false })),
    punching: false,
    error: "",
  },

  timer: null,

  onShow() {
    const auth = getStoredAuth()
    if (!auth?.accessToken || !auth?.deviceToken) {
      wx.reLaunch({ url: "/pages/login/login" })
      return
    }
    this.setData({
      displayName: auth.user?.displayName || auth.user?.username || "员工",
      todayLabel: todayLabel(),
    })
    this.tick()
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => this.tick(), 1000)
    this.loadToday()
  },

  onHide() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  tick() {
    const d = new Date()
    this.setData({
      nowText: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    })
  },

  async loadToday() {
    try {
      const bundle = await request(
        "GET",
        `/attendance/bundle?month=${monthKey()}`
      )
      const today = Array.isArray(bundle.today) ? bundle.today : []
      const done = new Set(today.map((r) => r.type))
      const labelMap = Object.fromEntries(
        PUNCH_TYPES.map((item) => [item.type, item.label])
      )
      this.setData({
        records: today.map((r) => ({
          id: r.id,
          label: labelMap[r.type] || r.type,
          timeText: formatTime(r.punchTime),
        })),
        punchButtons: PUNCH_TYPES.map((item) => ({
          ...item,
          done: done.has(item.type),
        })),
        error: "",
      })
    } catch (err) {
      if (err.status === 401) {
        wx.reLaunch({ url: "/pages/login/login" })
        return
      }
      this.setData({ error: err.message || "加载今日打卡失败" })
    }
  },

  async onPunch(e) {
    const type = e.currentTarget.dataset.type
    const auth = getStoredAuth()
    if (!auth?.deviceToken || this.data.punching) return
    this.setData({ punching: true, error: "" })
    try {
      const loc = await getLocation()
      await request("POST", "/attendance/punch", {
        type,
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: "",
        deviceToken: auth.deviceToken,
      })
      wx.showToast({ title: "打卡成功", icon: "success" })
      await this.loadToday()
    } catch (err) {
      this.setData({ error: err.message || "打卡失败" })
    } finally {
      this.setData({ punching: false })
    }
  },

  logout() {
    clearStoredAuth()
    wx.reLaunch({ url: "/pages/login/login" })
  },
})
