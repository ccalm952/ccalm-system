/**
 * 权限点目录（唯一来源）。
 * - key 形如 `domain.action`，前后端共用；新增只能往后加，不要改名。
 * - 角色（Role.permissions）里存的就是这些 key。
 */
export const PERMISSION_GROUPS = [
  {
    key: "appointment",
    label: "预约",
    items: [
      { key: "appointment.view", label: "查看看板/列表" },
      { key: "appointment.create", label: "新建/编辑预约" },
      { key: "appointment.edit_any", label: "修改他人预约" },
      { key: "appointment.delete", label: "删除预约" },
      { key: "appointment.delete_past", label: "删除历史预约" },
      { key: "appointment.export", label: "导出预约列表" },
      { key: "appointment.pending", label: "待定预约与批量顺延" },
      { key: "appointment.settings", label: "预约设置（项目/时长/底色）" },
    ],
  },
  {
    key: "patient",
    label: "患者",
    items: [
      { key: "patient.view", label: "查看患者" },
      { key: "patient.edit", label: "新建/编辑/合并患者" },
    ],
  },
  {
    key: "record",
    label: "病历",
    items: [
      { key: "record.view", label: "查看病历" },
      { key: "record.edit", label: "新建/编辑病历" },
    ],
  },
  {
    key: "charge",
    label: "收费",
    items: [
      { key: "charge.view", label: "查看收费单" },
      { key: "charge.edit", label: "开单/收费/退费" },
    ],
  },
  {
    key: "salary",
    label: "薪资",
    items: [{ key: "salary.view", label: "查看与编辑薪资" }],
  },
  {
    key: "staff",
    label: "人员与角色",
    items: [{ key: "staff.manage", label: "人员、角色与权限管理" }],
  },
  {
    key: "attendance",
    label: "考勤",
    items: [{ key: "attendance.manage", label: "管理他人考勤/排班" }],
  },
  {
    key: "report",
    label: "报表与库房",
    items: [
      { key: "report.view", label: "查看报表" },
      { key: "warehouse.manage", label: "库房管理" },
    ],
  },
] as const;

export type Permission =
  (typeof PERMISSION_GROUPS)[number]["items"][number]["key"];

export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((g) =>
  g.items.map((i) => i.key),
);

const PERMISSION_SET = new Set(ALL_PERMISSIONS);

export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value);
}

/** 内置角色 id（迁移脚本里固定写入） */
export const BUILTIN_ROLE_IDS = {
  admin: "builtin-admin",
  doctor: "builtin-doctor",
  nurse: "builtin-nurse",
} as const;

/** 旧 User.role 由「是否拥有管理员角色」推导，过渡期用 */
export function legacyRoleFor(roleIds: string[]): "admin" | "user" {
  return roleIds.includes(BUILTIN_ROLE_IDS.admin) ? "admin" : "user";
}
