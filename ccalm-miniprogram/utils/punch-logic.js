const {
  isWallClockInInclusiveRange,
  isWallClockAfter,
  todayYmd,
} = require("./time");

const PUNCH_TYPES = [
  "morning_in",
  "morning_out",
  "afternoon_in",
  "afternoon_out",
];

const PUNCH_LABEL = {
  morning_in: "上午上班",
  morning_out: "上午下班",
  afternoon_in: "下午上班",
  afternoon_out: "下午下班",
};

const DEFAULT_MAKEUP_TIME = {
  morning_in: "08:30",
  morning_out: "12:00",
  afternoon_in: "14:30",
  afternoon_out: "18:00",
};

function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function insideFence(lat, lng, fence) {
  if (!fence || !fence.enabled) return true;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    haversineDistanceMeters(lat, lng, fence.centerLat, fence.centerLng) <=
    fence.radiusM
  );
}

function isMorningRest(declaredRest) {
  return declaredRest === "full_rest" || declaredRest === "morning_rest";
}

function isAfternoonRest(declaredRest) {
  return declaredRest === "full_rest" || declaredRest === "afternoon_rest";
}

function isHalfRest(declaredRest, half) {
  return half === "morning"
    ? isMorningRest(declaredRest)
    : isAfternoonRest(declaredRest);
}

function isPunchBlockedByRest(type, declaredRest) {
  if (
    (type === "morning_in" || type === "morning_out") &&
    isMorningRest(declaredRest)
  )
    return true;
  if (
    (type === "afternoon_in" || type === "afternoon_out") &&
    isAfternoonRest(declaredRest)
  )
    return true;
  return false;
}

function todayTypeMap(records) {
  const map = {};
  for (const r of records || []) {
    if (r && r.type) map[r.type] = r;
  }
  return map;
}

function isPunchDisabled(t, opts) {
  const { lat, lng, fence, shift, map, declaredRest, at } = opts;
  if (!lat) return true;
  if (fence && fence.enabled && !insideFence(lat, lng, fence)) return true;
  if (isPunchBlockedByRest(t, declaredRest)) return true;

  if (t === "morning_in") {
    if (map.morning_in) return true;
    if (
      !isWallClockInInclusiveRange(
        at,
        shift.morningInWindowStart,
        shift.morningInWindowEnd,
      )
    )
      return true;
  }
  if (t === "morning_out") {
    if (!map.morning_in) return true;
    if (
      !isWallClockInInclusiveRange(
        at,
        shift.morningOutWindowStart,
        shift.morningOutWindowEnd,
      )
    )
      return true;
  }
  if (t === "afternoon_in") {
    if (map.afternoon_in) return true;
    if (
      !isWallClockInInclusiveRange(
        at,
        shift.afternoonInWindowStart,
        shift.afternoonInWindowEnd,
      )
    )
      return true;
  }
  if (t === "afternoon_out") {
    if (!map.afternoon_in) return true;
    if (
      !isWallClockInInclusiveRange(
        at,
        shift.afternoonOutWindowStart,
        shift.afternoonOutWindowEnd,
      )
    )
      return true;
  }
  return false;
}

function pickQuickPunchType(opts) {
  for (const t of PUNCH_TYPES) {
    if (!isPunchDisabled(t, opts)) return t;
  }
  return null;
}

function passesMakeupTodayGate(dateStr, type, gate, at = new Date()) {
  if (dateStr !== todayYmd(at)) return true;
  if (!gate) return false;
  const end =
    type === "morning_in" || type === "morning_out"
      ? gate.morningInWindowEnd
      : gate.afternoonInWindowEnd;
  return isWallClockAfter(at, end);
}

function slotTime(row, type) {
  if (type === "morning_in") return row.morningIn;
  if (type === "morning_out") return row.morningOut;
  if (type === "afternoon_in") return row.afternoonIn;
  return row.afternoonOut;
}

function canEmployeeMakeup(row, type) {
  if (isPunchBlockedByRest(type, row.declaredRest)) return false;
  if (type === "morning_in" || type === "afternoon_in") {
    return !slotTime(row, type);
  }
  const inType = type === "morning_out" ? "morning_in" : "afternoon_in";
  return !!(slotTime(row, inType) && !slotTime(row, type));
}

function halfHasPunch(row, half) {
  if (half === "morning") return !!(row.morningIn || row.morningOut);
  return !!(row.afternoonIn || row.afternoonOut);
}

module.exports = {
  PUNCH_TYPES,
  PUNCH_LABEL,
  DEFAULT_MAKEUP_TIME,
  insideFence,
  isHalfRest,
  todayTypeMap,
  pickQuickPunchType,
  passesMakeupTodayGate,
  canEmployeeMakeup,
  halfHasPunch,
  slotTime,
};
