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
    stats: "/implant/stats",
    inventory: "/implant/inventory",
  },
  warehouse: {
    root: "/warehouse",
    ledger: "/warehouse/ledger",
    stats: "/warehouse/stats",
  },
} as const;
