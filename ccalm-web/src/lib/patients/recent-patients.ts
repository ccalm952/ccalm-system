export type RecentPatient = { id: number; name: string; chartNo: string };

const STORAGE_KEY = "patients:recent";
export const RECENT_PATIENTS_EVENT = "patients:recent-change";
const MAX_RECENT = 20;

/** 放到最前并去重，超出上限丢掉最旧的 */
export function pushRecentPatient(
  list: RecentPatient[],
  patient: RecentPatient,
  max = MAX_RECENT,
): RecentPatient[] {
  return [patient, ...list.filter((p) => p.id !== patient.id)].slice(0, max);
}

export function loadRecentPatients(): RecentPatient[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as RecentPatient[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentPatients(list: RecentPatient[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(RECENT_PATIENTS_EVENT));
}

/** 打开患者详情时记一笔 */
export function rememberRecentPatient(patient: RecentPatient) {
  saveRecentPatients(pushRecentPatient(loadRecentPatients(), patient));
}
