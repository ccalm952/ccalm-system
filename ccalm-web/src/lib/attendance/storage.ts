import type { AttendanceRecord, AttendanceShiftFullConfig, GeofenceConfig } from "./types";
import { DEFAULT_SHIFT } from "./shift";

const KEY_GEOFENCE = "attendance:geofence:v1";
const KEY_SHIFT = "attendance:shift:v1";
const KEY_RECORDS = "attendance:records:v1";
const KEY_USER = "attendance:user:v1";

type StoredUser = { userId: string; userName: string };

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadOrCreateUser(): StoredUser {
  const v = safeParse<StoredUser>(localStorage.getItem(KEY_USER));
  if (v?.userId && v?.userName) return v;
  const created: StoredUser = {
    userId: crypto.randomUUID(),
    userName: "我",
  };
  localStorage.setItem(KEY_USER, JSON.stringify(created));
  return created;
}

export function saveUser(u: StoredUser) {
  localStorage.setItem(KEY_USER, JSON.stringify(u));
}

export function loadGeofence(): GeofenceConfig {
  const v = safeParse<GeofenceConfig>(localStorage.getItem(KEY_GEOFENCE));
  if (!v) {
    return {
      enabled: false,
      centerLat: 39.9042,
      centerLng: 116.4074,
      radiusM: 200,
      label: "门诊大楼",
    };
  }
  return {
    enabled: !!v.enabled,
    centerLat: Number(v.centerLat) || 0,
    centerLng: Number(v.centerLng) || 0,
    radiusM: Math.max(1, Number(v.radiusM) || 200),
    label: typeof v.label === "string" ? v.label : "",
  };
}

export function saveGeofence(v: GeofenceConfig) {
  localStorage.setItem(KEY_GEOFENCE, JSON.stringify(v));
}

export function clearGeofence() {
  localStorage.removeItem(KEY_GEOFENCE);
}

export function loadShift(): AttendanceShiftFullConfig {
  const v = safeParse<AttendanceShiftFullConfig>(localStorage.getItem(KEY_SHIFT));
  if (!v) return DEFAULT_SHIFT;
  return {
    ...DEFAULT_SHIFT,
    ...v,
    morning: { ...DEFAULT_SHIFT.morning, ...v.morning },
    afternoon: { ...DEFAULT_SHIFT.afternoon, ...v.afternoon },
  };
}

export function saveShift(v: AttendanceShiftFullConfig) {
  localStorage.setItem(KEY_SHIFT, JSON.stringify(v));
}

export function resetShiftToDefault() {
  localStorage.removeItem(KEY_SHIFT);
}

export function loadRecords(): AttendanceRecord[] {
  const v = safeParse<AttendanceRecord[]>(localStorage.getItem(KEY_RECORDS));
  if (!Array.isArray(v)) return [];
  return v
    .filter((r) => r && typeof r === "object")
    .map((r) => ({
      id: String((r as AttendanceRecord).id || ""),
      userId: String((r as AttendanceRecord).userId || ""),
      userName: String((r as AttendanceRecord).userName || ""),
      type: (r as AttendanceRecord).type,
      punchTime: String((r as AttendanceRecord).punchTime || ""),
      latitude: Number((r as AttendanceRecord).latitude) || 0,
      longitude: Number((r as AttendanceRecord).longitude) || 0,
      address:
        typeof (r as AttendanceRecord).address === "string"
          ? (r as AttendanceRecord).address
          : undefined,
    }))
    .filter((r) => r.id && r.userId && r.punchTime && typeof r.type === "string");
}

export function saveRecords(records: AttendanceRecord[]) {
  localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
}

export function addRecord(record: AttendanceRecord) {
  const records = loadRecords();
  records.push(record);
  saveRecords(records);
}
