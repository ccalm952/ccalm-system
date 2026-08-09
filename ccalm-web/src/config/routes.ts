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
    schedule: "/attendance/schedule",
    shiftSettings: "/attendance/shift-settings",
    checkInRange: "/attendance/check-in-range",
  },
  implant: {
    root: "/implant",
    records: "/implant/records",
    patients: "/implant/patients",
    pending: "/implant/pending",
    stats: "/implant/stats",
    inventory: "/implant/inventory",
  },
  orthodontics: {
    root: "/orthodontics",
    treating: "/orthodontics/treating",
    appliance: "/orthodontics/appliance",
    completed: "/orthodontics/completed",
  },
  salary: {
    root: "/salary",
  },
  memos: {
    root: "/memos",
  },
} as const;
