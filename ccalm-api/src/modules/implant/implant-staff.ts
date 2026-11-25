/** 配台人员字符串拆成一人一名（兼容 +、顿号、中英文逗号、空白） */
export function splitImplantStaffNames(
  raw: string | null | undefined,
): string[] {
  const s = raw?.trim() ?? "";
  if (!s) return [];
  return s
    .split(/[、,，+\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** 按人次汇总配台：一条就诊里多人各记 1 次 */
export function countImplantStaffByName(
  visits: { staff: string | null }[],
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of visits) {
    for (const n of splitImplantStaffNames(v.staff)) {
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh"));
}
