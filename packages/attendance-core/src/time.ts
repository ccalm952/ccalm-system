export function minutesFromMidnight(hhmm: string): number {
  const [h, m] = String(hhmm || "")
    .trim()
    .split(":")
  const hh = Number(h)
  const mm = Number(m)
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return NaN
  return hh * 60 + mm
}

export function isWallClockAfterMinutes(
  wallMinutes: number,
  hhmm: string
): boolean {
  const target = minutesFromMidnight(hhmm)
  if (!Number.isFinite(target)) return false
  return wallMinutes > target
}
