import type { Prisma } from "@prisma/client";
import dayjs, { type Dayjs } from "dayjs";

export const PATIENT_GROUPS = [
  "all",
  "implant",
  "pending",
  "orthodontics",
  "dormant",
  "duplicate",
] as const;

export type PatientGroup = (typeof PATIENT_GROUPS)[number];

export function parsePatientGroup(raw?: string): PatientGroup {
  return PATIENT_GROUPS.find((g) => g === raw) ?? "all";
}

/** 一年以上未到店：到过店，但最近一年没有门诊、种植或正畸就诊 */
export function dormantCutoff(today: Dayjs = dayjs()): string {
  return today.subtract(1, "year").format("YYYY-MM-DD");
}

export const ATTENDED_VISIT_STATUSES = ["arrived", "completed"];

/** duplicateNames：重名患者的姓名，只有 duplicate 分组用到 */
export function patientGroupWhere(
  group: PatientGroup,
  duplicateNames: string[] = [],
  today: Dayjs = dayjs(),
): Prisma.PatientWhereInput {
  switch (group) {
    case "duplicate":
      return { name: { in: duplicateNames } };
    case "implant":
      return { visits: { some: {} } };
    case "pending":
      return { pendings: { some: {} } };
    case "orthodontics":
      return { orthodontics: { some: { category: { not: "completed" } } } };
    case "dormant": {
      const cutoff = dormantCutoff(today);
      return {
        AND: [
          {
            OR: [
              { visits: { some: {} } },
              {
                clinicVisits: {
                  some: { status: { in: ATTENDED_VISIT_STATUSES } },
                },
              },
              { orthodontics: { some: { lastVisitDate: { not: null } } } },
            ],
          },
          { visits: { none: { visitDate: { gte: cutoff } } } },
          {
            clinicVisits: {
              none: {
                status: { in: ATTENDED_VISIT_STATUSES },
                visitDate: { gte: cutoff },
              },
            },
          },
          { orthodontics: { none: { lastVisitDate: { gte: cutoff } } } },
        ],
      };
    }
    default:
      return {};
  }
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
