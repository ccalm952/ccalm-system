export const ROUTES = {
  home: "/",
  auth: {
    login: "/login",
  },
  users: {
    root: "/users",
  },
  workbench: {
    root: "/workbench",
  },
  patients: {
    root: "/patients",
    detail: (id: number) => `/patients/${id}`,
  },
  attendance: {
    checkIn: "/attendance/check-in",
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
  warehouse: {
    root: "/warehouse",
  },
  materials: {
    implantCompare: "/materials/implant-compare",
    feeItems: "/materials/fee-items",
  },
  salary: {
    root: "/salary",
  },
} as const;
