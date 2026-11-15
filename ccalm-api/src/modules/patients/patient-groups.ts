import type { Prisma } from "@prisma/client";

export const PATIENT_GROUPS = ["all", "duplicate"] as const;

export type PatientGroup = (typeof PATIENT_GROUPS)[number];

export function parsePatientGroup(raw?: string): PatientGroup {
  return PATIENT_GROUPS.find((g) => g === raw) ?? "all";
}

/** 真实到诊口径：治疗完成才算来过（预约/失约/取消都不算） */
export const ATTENDED_VISIT_STATUSES = ["completed"];

/** duplicateNames：重名患者的姓名，只有 duplicate 分组用到 */
export function patientGroupWhere(
  group: PatientGroup,
  duplicateNames: string[] = [],
): Prisma.PatientWhereInput {
  if (group === "duplicate") return { name: { in: duplicateNames } };
  return {};
}

export function latestVisitDate(
  dates: Array<string | null | undefined>,
): string | null {
  let latest: string | null = null;
  for (const d of dates) {
    if (d && (latest == null || d > latest)) latest = d;
  }
  return latest;
}

export function normalizeTags(raw?: string[] | null): string[] {
  if (!raw) return [];
  return [...new Set(raw.map((t) => t.trim()).filter(Boolean))];
}
