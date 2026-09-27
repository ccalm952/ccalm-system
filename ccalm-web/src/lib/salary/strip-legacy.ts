const LEGACY_EMPLOYEE_KEYS = [
  "tier1Rate",
  "tier2Rate",
  "tier3Rate",
  "tier4Rate",
  "tier5Rate",
  "tier6Rate",
  "plantingBonusPerUnit",
] as const

function stripLegacyEmployee(
  employee: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...employee }
  for (const key of LEGACY_EMPLOYEE_KEYS) {
    delete next[key]
  }
  return next
}

export function stripLegacySalarySheet(
  data: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...data }
  delete next.tierThresholds
  if (Array.isArray(next.employees)) {
    next.employees = next.employees.map((row) =>
      stripLegacyEmployee(row as Record<string, unknown>)
    )
  }
  return next
}
