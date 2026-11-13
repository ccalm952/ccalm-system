export type PatientGroup =
  "all" | "implant" | "pending" | "orthodontics" | "dormant" | "duplicate";

export const PATIENT_AUTO_GROUPS: { value: PatientGroup; label: string }[] = [
  { value: "implant", label: "种植患者" },
  { value: "pending", label: "待种植" },
  { value: "orthodontics", label: "正畸中" },
  { value: "dormant", label: "一年以上未到店" },
  { value: "duplicate", label: "重复患者" },
];

export function parseTagsInput(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,，、\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}
