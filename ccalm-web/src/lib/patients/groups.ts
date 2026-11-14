export type PatientGroup = "all" | "duplicate";

export const PATIENT_AUTO_GROUPS: { value: PatientGroup; label: string }[] = [
  { value: "duplicate", label: "重复患者" },
];
