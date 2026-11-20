export function splitStaffNames(raw: string): string[] {
  return raw
    .split(/[、,，+\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinStaffNames(names: string[]): string {
  return names
    .map((s) => s.trim())
    .filter(Boolean)
    .join("，");
}

/** 配台展示/落库：顿号等旧分隔统一成全角逗号 */
export function formatStaffNames(raw: string): string {
  return joinStaffNames(splitStaffNames(raw));
}
