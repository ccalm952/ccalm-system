const TABS = [
  {
    key: "punch",
    label: "打卡",
    icon: "/assets/icons/punch.png",
    component: "punch-tab",
  },
  {
    key: "missing",
    label: "缺卡",
    icon: "/assets/icons/missing.png",
    component: "missing-tab",
    badge: "missing",
  },
  {
    key: "schedule",
    label: "排班",
    icon: "/assets/icons/schedule.png",
    component: "schedule-tab",
  },
  {
    key: "stats",
    label: "统计",
    icon: "/assets/icons/stats.png",
    component: "stats-tab",
  },
  {
    key: "mine",
    label: "我的",
    icon: "/assets/icons/mine.png",
    component: "mine-tab",
    badge: "review",
  },
];

const TAB_INDEX = {
  PUNCH: 0,
  MISSING: 1,
  SCHEDULE: 2,
  STATS: 3,
  MINE: 4,
};

module.exports = {
  TABS,
  TAB_INDEX,
};
