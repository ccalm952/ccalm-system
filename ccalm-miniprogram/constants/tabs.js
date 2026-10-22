const TABS = [
  {
    key: "punch",
    label: "打卡",
    icon: "/assets/icons/punch.png",
    component: "punch-tab",
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
    badge: "missing",
  },
];

const TAB_INDEX = {
  PUNCH: 0,
  SCHEDULE: 1,
  STATS: 2,
};

module.exports = {
  TABS,
  TAB_INDEX,
};
