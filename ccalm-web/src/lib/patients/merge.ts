export type MergeCandidate = {
  id: number;
  name: string;
  phone: string;
  chartNo: string;
  gender: string;
  birthday: string | null;
  tags: string[];
  remark: string;
  counts: {
    clinicVisits: number;
    medicalRecords: number;
    chargeOrders: number;
    implantVisits: number;
    pendings: number;
    orthodontics: number;
  };
};

export const MERGE_FIELDS = [
  { key: "name", label: "姓名" },
  { key: "gender", label: "性别" },
  { key: "phone", label: "手机" },
  { key: "chartNo", label: "病历号" },
  { key: "birthday", label: "生日" },
  { key: "tags", label: "标签" },
  { key: "remark", label: "备注" },
] as const;

export type MergeField = (typeof MERGE_FIELDS)[number]["key"];

/** 字段 → 取值来源患者 id */
export type MergePicks = Record<MergeField, number>;

export function mergeFieldText(p: MergeCandidate, field: MergeField): string {
  const v = p[field];
  if (Array.isArray(v)) return v.join("、");
  return v ?? "";
}

export function totalRecords(p: MergeCandidate): number {
  return Object.values(p.counts).reduce((a, b) => a + b, 0);
}

/** 记录最多的做保留档案，相同则取 id 最小（最早建档） */
export function defaultMergeTarget(list: MergeCandidate[]): number {
  return list.reduce((best, p) =>
    totalRecords(p) > totalRecords(best) ||
    (totalRecords(p) === totalRecords(best) && p.id < best.id)
      ? p
      : best,
  ).id;
}

/** 每个字段默认用保留档案的值；保留档案为空时取第一个非空的 */
export function defaultMergePicks(
  list: MergeCandidate[],
  targetId: number,
): MergePicks {
  const ordered = [
    ...list.filter((p) => p.id === targetId),
    ...list.filter((p) => p.id !== targetId),
  ];
  return Object.fromEntries(
    MERGE_FIELDS.map(({ key }) => [
      key,
      (ordered.find((p) => mergeFieldText(p, key)) ?? ordered[0]).id,
    ]),
  ) as MergePicks;
}

export function mergedValues(list: MergeCandidate[], picks: MergePicks) {
  const from = (field: MergeField) =>
    list.find((p) => p.id === picks[field]) ?? list[0];
  return {
    name: from("name").name,
    gender: from("gender").gender,
    phone: from("phone").phone,
    chartNo: from("chartNo").chartNo,
    birthday: from("birthday").birthday,
    tags: from("tags").tags,
    remark: from("remark").remark,
  };
}
