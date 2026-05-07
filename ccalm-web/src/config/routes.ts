export const ROUTES = {
  home: "/",
  auth: {
    login: "/login",
  },
  users: {
    root: "/users",
  },
  attendance: {
    root: "/attendance",
    stats: "/attendance/stats",
    shiftSettings: "/attendance/shift-settings",
    checkInRange: "/attendance/check-in-range",
  },
  planting: {
    root: "/planting",
    records: "/planting/records",
    patients: "/planting/patients",
    stats: "/planting/stats",
    inventory: "/planting/inventory",
  },
} as const;
