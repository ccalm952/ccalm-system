export type OrthodonticsCategory =
  | "treating"
  | "invisible"
  | "appliance"
  | "completed";

export const ORTHODONTICS_CATEGORY_OPTIONS: {
  value: OrthodonticsCategory;
  label: string;
}[] = [
  { value: "treating", label: "治疗中" },
  { value: "invisible", label: "隐形" },
  { value: "appliance", label: "矫治器" },
  { value: "completed", label: "已完成" },
];

export function orthodonticsCategoryLabel(
  category: OrthodonticsCategory,
): string {
  return (
    ORTHODONTICS_CATEGORY_OPTIONS.find((opt) => opt.value === category)
      ?.label ?? category
  );
}
