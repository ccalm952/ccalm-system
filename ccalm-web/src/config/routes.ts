export const ROUTES = {
  home: "/",
  auth: {
    login: "/login",
  },
  users: {
    root: "/users",
  },
  attendance: {
    stats: "/attendance/stats",
    schedule: "/attendance/schedule",
    shiftSettings: "/attendance/shift-settings",
    checkInRange: "/attendance/check-in-range",
  },
  implant: {
    records: "/implant/records",
    patients: "/implant/patients",
    pending: "/implant/pending",
    stats: "/implant/stats",
    inventory: "/implant/inventory",
  },
  orthodontics: {
    root: "/orthodontics",
  },
  salary: {
    root: "/salary",
  },
  memos: {
    root: "/memos",
  },
} as const;
