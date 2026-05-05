export const DEFAULT_GEOFENCE_ROW = {
  enabled: false,
  centerLat: 39.9042,
  centerLng: 116.4074,
  radiusM: 200,
  label: "门诊大楼",
}

export const DEFAULT_SHIFT_ROW = {
  morningLabel: "上午班",
  morningRangeStart: "08:30",
  morningRangeEnd: "12:00",
  afternoonLabel: "下午班",
  afternoonRangeStart: "14:30",
  afternoonRangeEnd: "18:00",
  morningInWindowStart: "08:30",
  morningInWindowEnd: "12:00",
  morningOutWindowStart: "12:00",
  morningOutWindowEnd: "14:30",
  afternoonInWindowStart: "14:30",
  afternoonInWindowEnd: "18:00",
  afternoonOutWindowStart: "18:00",
  afternoonOutWindowEnd: "23:59",
  overtimeMorningNormalEnd: "12:00",
  overtimeAfternoonNormalEnd: "18:00",
}
