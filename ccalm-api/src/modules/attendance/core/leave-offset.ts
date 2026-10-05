export function withEmployeeLeaveDays(
  data: Record<string, unknown>,
  name: string,
  days: number,
): { data: Record<string, unknown>; applied: boolean } {
  const employees = data.employees;
  if (!Array.isArray(employees)) return { data, applied: false };

  let found = false;
  let changed = false;
  const nextEmployees = employees.map((row: unknown): unknown => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return row;
    const emp = row as Record<string, unknown>;
    if (emp.name !== name) return row;
    found = true;
    if (emp.leaveDays === days) return row;
    changed = true;
    return { ...emp, leaveDays: days };
  });

  if (!found || !changed) return { data, applied: found };
  return { data: { ...data, employees: nextEmployees }, applied: true };
}
